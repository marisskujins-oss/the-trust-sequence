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

async function createComment(accessToken, postUrn, actorUrn, text) {
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
    throw new Error(`comment_create_failed (${res.status}): ${await readError(res)}`);
  }
  const data = await res.json().catch(() => ({}));
  return data.$URN || data.urn || data.commentUrn || null;
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
  if (firstComment) {
    try {
      commentUrn = await createComment(accessToken, postUrn, ownerUrn, firstComment);
    } catch (err) {
      commentError = err.message;
    }
  }

  return {
    postUrn,
    postUrl: postUrnToUrl(postUrn),
    imageUrn,
    commentUrn,
    commentError,
  };
}

module.exports = { publishPost, postUrnToUrl };
