const express = require('express');
const fs = require('fs/promises');
const auth = require('./auth');
const linkedin = require('./linkedin');
const queue = require('./queue');

const PORT = parseInt(process.env.PORT || '3000', 10);
const VERSION = require('../package.json').version;
const STARTED_AT = new Date().toISOString();

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || '';
const API_KEY = process.env.API_KEY || '';
const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY || '';
const MAILERLITE_GROUP_ID = '186043803624277608';
const ALLOWED_ORIGIN = 'https://thetrustsequence.com';

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.warn('WARN: LinkedIn OAuth env vars missing — /auth/* endpoints will not work.');
}
if (!API_KEY) {
  console.warn('WARN: API_KEY not set — /api/post will reject all requests.');
}
if (!MAILERLITE_API_KEY) {
  console.warn('WARN: MAILERLITE_API_KEY not set — /subscribe will reject all requests.');
}

const app = express();
app.use(express.json({ limit: '25mb' }));

function requireApiKey(req, res, next) {
  if (!API_KEY) {
    return res
      .status(503)
      .json({ error: 'api_key_not_configured', message: 'API_KEY env var must be set on the server.' });
  }
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.get('/api/status', async (_req, res) => {
  let linkedinAuth, qCount, fCount, lastPost;
  try {
    linkedinAuth = await auth.getAuthStatus();
  } catch (e) {
    linkedinAuth = { connected: false, error: e.message };
  }
  try {
    qCount = await queue.queueCount();
    fCount = await queue.failedCount();
    lastPost = await queue.lastPostInfo();
  } catch (e) {
    qCount = null;
    fCount = null;
    lastPost = null;
  }
  res.json({
    status: 'ok',
    version: VERSION,
    startedAt: STARTED_AT,
    uptimeSeconds: Math.round(process.uptime()),
    oauthConfigured: !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI),
    apiKeyConfigured: !!API_KEY,
    linkedin: linkedinAuth,
    queue: {
      pending: qCount,
      failed: fCount,
    },
    lastPost,
  });
});

app.get('/auth/login', (_req, res) => {
  if (!CLIENT_ID || !REDIRECT_URI) {
    return res
      .status(500)
      .type('text/plain')
      .send('OAuth not configured: missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI in .env');
  }
  const url = auth.buildAuthorizationUrl({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res
      .status(400)
      .type('html')
      .send(`<h1>Auth failed</h1><p><strong>${escapeHtml(String(error))}</strong></p><p>${escapeHtml(String(error_description || ''))}</p>`);
  }
  if (!code || !state) {
    return res.status(400).type('html').send('<h1>Bad request</h1><p>Missing code or state.</p>');
  }
  if (!auth.consumeState(String(state))) {
    return res
      .status(400)
      .type('html')
      .send('<h1>Bad request</h1><p>Invalid or expired state. Start again at <a href="/auth/login">/auth/login</a>.</p>');
  }

  try {
    const tokenResp = await auth.exchangeCodeForTokens({
      code: String(code),
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
    });
    const profile = await auth.fetchUserInfo(tokenResp.access_token);
    const expiresAt = new Date(Date.now() + tokenResp.expires_in * 1000).toISOString();
    await auth.saveTokens({
      access_token: tokenResp.access_token,
      refresh_token: tokenResp.refresh_token || null,
      refresh_token_expires_in: tokenResp.refresh_token_expires_in || null,
      expires_in: tokenResp.expires_in,
      expiresAt,
      scope: tokenResp.scope,
      token_type: tokenResp.token_type,
      profile: {
        sub: profile.sub,
        name: profile.name,
        email: profile.email,
      },
      obtainedAt: new Date().toISOString(),
    });
    const days = Math.round(tokenResp.expires_in / 86400);
    const refreshNote = tokenResp.refresh_token
      ? 'Refresh token received — auto-renewal possible.'
      : 'No refresh token issued — re-auth required before expiry.';
    res
      .type('html')
      .send(`<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:4rem auto;padding:0 1rem;line-height:1.6;color:#1a1814;">
<h1 style="color:#2a6b6b;">&#10003; Connected</h1>
<p>Authenticated as <strong>${escapeHtml(profile.name || '')}</strong>${profile.email ? ` (${escapeHtml(profile.email)})` : ''}.</p>
<p>Token valid for <strong>${days} days</strong>, until ${escapeHtml(new Date(expiresAt).toUTCString())}.</p>
<p>${refreshNote}</p>
<p><a href="/api/status">View status</a></p>
</body></html>`);
  } catch (err) {
    console.error('auth callback error:', err);
    res
      .status(500)
      .type('html')
      .send(`<h1>Auth error</h1><pre style="white-space:pre-wrap;">${escapeHtml(err.message)}</pre>`);
  }
});

app.post('/api/post', requireApiKey, async (req, res) => {
  const { text, imagePath, imageBase64, firstComment, altText, visibility } = req.body || {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text_required', message: '`text` field is required.' });
  }

  let imageBuffer = null;
  if (imageBase64) {
    try {
      imageBuffer = Buffer.from(imageBase64, 'base64');
    } catch (e) {
      return res.status(400).json({ error: 'invalid_image_base64', message: e.message });
    }
  } else if (imagePath) {
    try {
      imageBuffer = await fs.readFile(imagePath);
    } catch (e) {
      return res.status(400).json({ error: 'image_path_unreadable', message: e.message });
    }
  }

  try {
    const result = await linkedin.publishPost({
      text,
      imageBuffer,
      altText,
      firstComment,
      visibility,
    });
    console.log(`posted: ${result.postUrl} (image=${!!result.imageUrn}, comment=${!!result.commentUrn}${result.commentError ? `, comment_error=${result.commentError}` : ''})`);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('post error:', err);
    res.status(500).json({ error: 'post_failed', message: err.message });
  }
});

app.post('/api/schedule', requireApiKey, async (req, res) => {
  const { text, imagePath, imageBase64, firstComment, altText, visibility, scheduledAt } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text_required' });
  }
  if (!scheduledAt) {
    return res.status(400).json({ error: 'scheduledAt_required' });
  }
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime())) {
    return res.status(400).json({ error: 'invalid_scheduledAt', message: 'Use ISO 8601 (e.g. 2026-04-28T08:00:00+03:00)' });
  }
  try {
    const item = await queue.enqueue({ text, imagePath, imageBase64, firstComment, altText, visibility, scheduledAt: when });
    res.json({
      success: true,
      queueId: item.id,
      scheduledAt: item.scheduledAt,
      status: item.status,
    });
  } catch (err) {
    console.error('schedule error:', err);
    res.status(500).json({ error: 'schedule_failed', message: err.message });
  }
});

app.get('/api/queue', requireApiKey, async (_req, res) => {
  try {
    const items = await queue.listQueue();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'queue_read_failed', message: err.message });
  }
});

app.delete('/api/queue/:id', requireApiKey, async (req, res) => {
  try {
    const result = await queue.cancel(req.params.id);
    if (!result.found) return res.status(404).json({ error: 'not_found' });
    if (!result.cancelled) return res.status(409).json({ error: 'cannot_cancel', reason: result.reason });
    res.json({ success: true, cancelled: result.item });
  } catch (err) {
    res.status(500).json({ error: 'cancel_failed', message: err.message });
  }
});

// ── Public subscriber endpoint ────────────────────────────────────────────────
// Called from thetrustsequence.com signup form. No API key required.
// CORS is locked to ALLOWED_ORIGIN only.

app.options('/subscribe', (req, res) => {
  const origin = req.headers.origin || '';
  if (origin === ALLOWED_ORIGIN) {
    res.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

app.post('/subscribe', async (req, res) => {
  const origin = req.headers.origin || '';
  if (origin === ALLOWED_ORIGIN) {
    res.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }

  if (!MAILERLITE_API_KEY) {
    console.error('subscribe: MAILERLITE_API_KEY not configured');
    return res.status(503).json({ error: 'service_unavailable', message: 'Email service not configured.' });
  }

  const { email, name } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'invalid_email', message: 'A valid email address is required.' });
  }

  const payload = {
    email: email.trim().toLowerCase(),
    fields: { name: (name || '').trim() },
    groups: [MAILERLITE_GROUP_ID],
  };

  try {
    const mlRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 200 = updated existing subscriber, 201 = new subscriber — both are success
    if (mlRes.ok) {
      console.log(`subscribe: added/updated ${payload.email}`);
      return res.status(200).json({ success: true });
    }

    const body = await mlRes.json().catch(() => ({}));
    console.error(`subscribe: MailerLite returned ${mlRes.status}`, body);
    return res.status(502).json({ error: 'upstream_error', message: 'Could not save subscription. Please try again.' });
  } catch (err) {
    console.error('subscribe: fetch error', err.message);
    return res.status(500).json({ error: 'internal_error', message: 'Unexpected error. Please try again.' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.type('text/plain').send('LinkedIn Poster — see /api/status\n');
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`linkedin-poster v${VERSION} listening on 127.0.0.1:${PORT}`);
  queue.startScheduler().catch((err) => console.error('scheduler start error:', err));
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
