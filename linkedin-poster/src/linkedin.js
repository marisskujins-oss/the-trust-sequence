const auth = require('./auth');

const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202601';
const REST_BASE = 'https://api.linkedin.com/rest';
const V2_BASE = 'https://api.linkedin.com/v2';

const ESCAPE_RE = /[\(\)<>#\\_\{\}\[\]\*~|@]/g;
function escapeCommentary(text) {
  return String(text).replace(ESCAPE_RE, '\\$&');
}

function restHeaders(accessToken, extra = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  };
}

async function readError(res) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j.message || j.error_description || j.error || text;
  } catch (_) {
    return text;
  }
}

async function initializeImageUpload(accessToken, ownerUrn) {
  const res = await fetch(`${REST_BASE}/images?action=initializeUpload`, {
    method: 'POST',
    headers: restHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  if (!res.ok) {
    throw new Error(`image_init_failed (${res.status}): ${await readError(res)}`);
  }
  const data = await res.json();
  return {
    uploadUrl: data.value.uploadUrl,
    imageUrn: data.value.image,
  };
}

async function uploadImageBinary(uploadUrl, accessToken, imageBuffer) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imageBuffer,
  });
  if (!res.ok) {
    throw new Error(`image_upload_failed (${res.status}): ${await readError(res)}`);
  }
}

async function createPost(accessToken, { authorUrn, text, imageUrn, altText, visibility }) {
  const body = {
    author: authorUrn,
    commentary: escapeCommentary(text),
    visibility,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  if (imageUrn) {
    body.content = {
      media: {
        id: imageUrn,
        altText: altText || '',
      },
    };
  }
  const res = await fetch(`${REST_BASE}/posts`, {
    method: 'POST',
    headers: restHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`post_create_failed (${res.status}): ${await readError(res)}`);
  }
  const postUrn = res.headers.get('x-restli-id');
  if (!postUrn) {
    throw new Error('post_create_missing_urn_in_response');
  }
  return postUrn;
}

const COMMENT_RETRY_MAX_ATTEMPTS = parseInt(
  process.env.COMMENT_RETRY_MAX_ATTEMPTS || '6',
  10
);
const COMMENT_RETRY_INITIAL_DELAY_MS = parseInt(
  process.env.COMMENT_RETRY_INITIAL_DELAY_MS || '1500',
  10
);
const COMMENT_RETRY_BACKOFF_MULTIPLIER = parseFloat(
  process.env.COMMENT_RETRY_BACKOFF_MULTIPLIER || '2.0'
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPropagationRace(err) {
  return (
    err &&
    err.statusCode === 404 &&
    typeof err.errorBody === 'string' &&
    /Unable to obtain activity for urn/i.test(err.errorBody)
  );
}

async function createCommentOnce(accessToken, postUrn, actorUrn, text) {
  const encodedUrn = encodeURIComponent(postUrn);
  const res = await fetch(`${V2_BASE}/socialActions/${encodedUrn}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actor: actorUrn,
      message: { text: String(text) },
    }),
  });
  if (!res.ok) {
    const errorBody = await readError(res);
    const err = new Error(`comment_create_failed (${res.status}): ${errorBody}`);
    err.statusCode = res.status;
    err.errorBody = errorBody;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  return data.$URN || data.urn || data.commentUrn || null;
}

// LinkedIn returns a share URN immediately, but the corresponding activity
// URN that the comments endpoint needs is materialised by a separate
// pipeline. A 404 with "Unable to obtain activity for urn" can occur for
// 1–30 seconds after share creation. Retry with exponential backoff on
// that specific error only; fail fast on all others.
async function createComment(accessToken, postUrn, actorUrn, text) {
  let attempt = 0;
  let lastError = null;
  while (attempt < COMMENT_RETRY_MAX_ATTEMPTS) {
    try {
      const commentUrn = await createCommentOnce(accessToken, postUrn, actorUrn, text);
      return { commentUrn, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (!isPropagationRace(err)) {
        err.attempts = attempt;
        throw err;
      }
      if (attempt >= COMMENT_RETRY_MAX_ATTEMPTS) break;
      const delay = Math.round(
        COMMENT_RETRY_INITIAL_DELAY_MS *
          Math.pow(COMMENT_RETRY_BACKOFF_MULTIPLIER, attempt - 1)
      );
      console.log(
        `[linkedin] comment URN propagation 404 for ${postUrn}, retrying in ${delay}ms (attempt ${attempt}/${COMMENT_RETRY_MAX_ATTEMPTS})`
      );
      await sleep(delay);
    }
  }
  const giveUp = new Error(
    `comment_create_failed_after_${COMMENT_RETRY_MAX_ATTEMPTS}_attempts: ${lastError ? lastError.message : 'unknown'}`
  );
  giveUp.attempts = COMMENT_RETRY_MAX_ATTEMPTS;
  giveUp.statusCode = lastError?.statusCode;
  throw giveUp;
}

function postUrnToUrl(postUrn) {
  return `https://www.linkedin.com/feed/update/${postUrn}`;
}

async function publishPost({ text, imageBuffer, altText, firstComment, visibility }) {
  const tokens = await auth.loadTokens();
  if (!tokens) throw new Error('not_authenticated');
  if (new Date(tokens.expiresAt) <= new Date()) throw new Error('token_expired');
  if (!tokens.profile?.sub) throw new Error('missing_profile_sub');

  const accessToken = tokens.access_token;
  const ownerUrn = `urn:li:person:${tokens.profile.sub}`;
  const vis = visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';

  let imageUrn = null;
  if (imageBuffer && imageBuffer.length > 0) {
    const init = await initializeImageUpload(accessToken, ownerUrn);
    await uploadImageBinary(init.uploadUrl, accessToken, imageBuffer);
    imageUrn = init.imageUrn;
  }

  const postUrn = await createPost(accessToken, {
    authorUrn: ownerUrn,
    text,
    imageUrn,
    altText,
    visibility: vis,
  });

  let commentUrn = null;
  let commentError = null;
  let commentRetries = 0;
  if (firstComment) {
    try {
      const result = await createComment(accessToken, postUrn, ownerUrn, firstComment);
      commentUrn = result.commentUrn;
      commentRetries = result.attempts - 1;
    } catch (err) {
      commentError = err.message;
      commentRetries = err.attempts ? err.attempts - 1 : 0;
    }
  }

  return {
    postUrn,
    postUrl: postUrnToUrl(postUrn),
    imageUrn,
    commentUrn,
    commentError,
    commentRetries,
  };
}

module.exports = { publishPost, postUrnToUrl };
