const fs = require('fs/promises');
const crypto = require('crypto');
const path = require('path');

const TOKENS_PATH = path.join(__dirname, '..', 'data', 'tokens.json');

const SCOPES = ['openid', 'profile', 'w_member_social'];

const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function generateState() {
  cleanExpiredStates();
  const state = crypto.randomBytes(32).toString('hex');
  pendingStates.set(state, Date.now());
  return state;
}

function consumeState(state) {
  if (!state || !pendingStates.has(state)) return false;
  const ts = pendingStates.get(state);
  pendingStates.delete(state);
  return Date.now() - ts <= STATE_TTL_MS;
}

function cleanExpiredStates() {
  const now = Date.now();
  for (const [s, ts] of pendingStates) {
    if (now - ts > STATE_TTL_MS) pendingStates.delete(s);
  }
}

function buildAuthorizationUrl({ clientId, redirectUri }) {
  const state = generateState();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES.join(' '),
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

async function exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri }) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const err = JSON.parse(text);
      detail = err.error_description || err.error || text;
    } catch (_) {}
    throw new Error(`token_exchange_failed (${res.status}): ${detail}`);
  }
  return JSON.parse(text);
}

async function fetchUserInfo(accessToken) {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`userinfo_failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function saveTokens(record) {
  await fs.writeFile(TOKENS_PATH, JSON.stringify(record, null, 2), { mode: 0o600 });
}

async function loadTokens() {
  try {
    const data = await fs.readFile(TOKENS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

async function getAuthStatus() {
  const tokens = await loadTokens();
  if (!tokens) return { connected: false, reason: 'no_tokens' };
  const expiresAt = new Date(tokens.expiresAt);
  const now = new Date();
  const expired = expiresAt <= now;
  return {
    connected: !expired,
    expired,
    name: tokens.profile?.name || null,
    sub: tokens.profile?.sub || null,
    expiresAt: tokens.expiresAt,
    expiresInDays: Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24))),
    hasRefreshToken: !!tokens.refresh_token,
    scope: tokens.scope || null,
  };
}

module.exports = {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  saveTokens,
  loadTokens,
  consumeState,
  getAuthStatus,
};
