# LinkedIn Poster — Integration Brief for Cowork

This document tells Cowork how to publish LinkedIn posts via the self-hosted
`linkedin-poster` service. **Use this instead of the previous Zapier MCP
approach** — the Zapier flow was abandoned because of fragile image hosting
and unreliable URN extraction.

The service is live at:

    https://poster.thetrustsequence.com

It runs on a Hetzner box (controlled by Maris), uses LinkedIn's official OAuth
2.0 flow, uploads images directly to LinkedIn's media API, and posts the first
comment within seconds of publishing the post. No third-party image host. No
Zapier. No URN parsing from natural-language responses.

## 1. Authentication

Every write call requires a Bearer token in the `Authorization` header:

    Authorization: Bearer <API_KEY>

The API key is a 64-character hex string. Maris will provide it through your
secrets mechanism — never inline it in a prompt or commit it to git. If the
key is missing or wrong, the service returns `401 unauthorized`.

## 2. Endpoints

Base URL: `https://poster.thetrustsequence.com`

### `POST /api/schedule` — queue a post for the future (most common)

Request body:

```json
{
  "text": "The full post text. Multiple paragraphs OK.",
  "imageBase64": "<base64-encoded JPEG or PNG, max 20MB>",
  "firstComment": "First comment text — appears as a comment immediately under the post.",
  "altText": "Optional alt text for the image.",
  "visibility": "PUBLIC",
  "scheduledAt": "2026-04-28T08:00:00+03:00"
}
```

Required: `text`, `scheduledAt`.
Optional: `imageBase64` (or `imagePath`), `firstComment`, `altText`, `visibility`.

`scheduledAt` must be ISO 8601 with timezone (e.g. `2026-04-28T08:00:00+03:00`
for Riga summer time, or `2026-04-28T05:00:00Z` for UTC).

`visibility` accepts `"PUBLIC"` (default — anyone on or off LinkedIn) or
`"CONNECTIONS"` (Maris's connections only).

`imageBase64` is the simplest — encode the image bytes as base64 and include
in the JSON body. Server decodes and persists to disk; the image is included
when the post fires.

Response (success):

```json
{
  "success": true,
  "queueId": "q_a1b2c3d4e5f6",
  "scheduledAt": "2026-04-28T05:00:00.000Z",
  "status": "queued"
}
```

Response (validation error, 400):

```json
{
  "error": "invalid_scheduledAt",
  "message": "Use ISO 8601 (e.g. 2026-04-28T08:00:00+03:00)"
}
```

### `POST /api/post` — publish immediately

Same body shape as `/api/schedule` but **omit `scheduledAt`**. Publishes the
post synchronously and returns the LinkedIn post URL.

Response:

```json
{
  "success": true,
  "postUrn": "urn:li:share:7123456789",
  "postUrl": "https://www.linkedin.com/feed/update/urn:li:share:7123456789",
  "imageUrn": "urn:li:image:D5610AQ...",
  "commentUrn": "urn:li:comment:(urn:li:activity:..., ...)",
  "commentError": null,
  "commentRetries": 0
}
```

`commentRetries` is the number of failed comment attempts before success
(or before giving up). LinkedIn's activity URN is eventually-consistent —
the server retries the comment up to 6 times with exponential backoff
(1.5s, 3s, 6s, 12s, 24s) on the specific 404 "Unable to obtain activity
for urn" error. Permanent errors (401, 403, 422) fail fast.

If `commentRetries` > 2, LinkedIn's propagation is running slow that day —
worth a structured log. If `commentRetries` >= 6 and `commentError` is
populated, the comment didn't make it through; the post is still live but
without its CTA. Surface this to Maris.

If the post succeeded but the comment failed, `commentError` will contain
the error message. The post itself is still published — re-running won't
help. Surface this to Maris if it happens.

Use `/api/schedule` for normal Sunday-batch operation. Use `/api/post` only if
you need to publish on the same call (e.g. retry, debug, urgent post).

### `GET /api/queue` — list all queued / scheduled / posted / failed items

Returns:

```json
{
  "items": [
    {
      "id": "q_a1b2c3d4e5f6",
      "createdAt": "2026-04-25T...",
      "scheduledAt": "2026-04-28T05:00:00.000Z",
      "status": "queued | pending_retry | firing | posted | failed",
      "text": "...",
      "imagePath": "/opt/linkedin-poster/data/images/q_a1b2c3d4e5f6.bin",
      "firstComment": "...",
      "attempts": 0,
      "lastError": null,
      "nextAttemptAt": "...",
      "postUrn": null,
      "postUrl": null,
      "postedAt": null
    }
  ]
}
```

Status meanings:
- `queued` — waiting to fire at `scheduledAt`
- `pending_retry` — first attempt failed, will retry at `nextAttemptAt` (5 min later)
- `firing` — currently being posted (rare to observe)
- `posted` — published successfully; `postUrl` populated
- `failed` — both attempts failed; needs manual intervention

### `DELETE /api/queue/{queueId}` — cancel a queued post

Works only if status is `queued` or `pending_retry`. If the item is already
`firing` or `posted`, returns `409 conflict`.

Response:

```json
{
  "success": true,
  "cancelled": { "id": "q_a1b2c3d4e5f6", "status": "queued", ... }
}
```

### `GET /api/status` — health check (no auth required)

Returns a public health blob. **You should hit this before every batch run**
to confirm the service is up, the LinkedIn token is still valid, and no posts
are stuck in `failed`.

```json
{
  "status": "ok",
  "version": "0.4.0",
  "oauthConfigured": true,
  "apiKeyConfigured": true,
  "linkedin": {
    "connected": true,
    "expired": false,
    "name": "Maris Skujins",
    "sub": "LlTpNIC4lN",
    "expiresAt": "2026-06-24T02:23:50.634Z",
    "expiresInDays": 59,
    "hasRefreshToken": false
  },
  "queue": { "pending": 0, "failed": 0 },
  "lastPost": {
    "postedAt": "2026-04-25T...",
    "postUrl": "https://www.linkedin.com/...",
    "success": true
  }
}
```

**Watch these fields:**

- `linkedin.connected: false` → service can't post. Alert Maris immediately.
- `linkedin.expiresInDays < 14` → re-auth window approaching. Tell Maris to
  visit `https://poster.thetrustsequence.com/auth/login` and click Allow
  before the token expires.
- `queue.failed > 0` → at least one post permanently failed. Pull
  `/api/queue` to see what and why; surface to Maris.

## 3. Image handling

Send images as **`imageBase64`** in the JSON body. The server handles upload to
LinkedIn's media API itself.

To prepare the field:

```python
# Python
import base64
with open(image_path, "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode("ascii")
```

```javascript
// Node
const fs = require('fs');
const imageBase64 = fs.readFileSync(imagePath).toString('base64');
```

```bash
# Shell
base64 -w0 /path/to/image.jpg
```

Constraints:
- JPEG or PNG only (LinkedIn requirement)
- Maximum 20 MB
- Recommended dimensions: 1200×1200 (square) or 1200×627 (landscape, link-share aspect)

The alternative (`imagePath`) only works if the file already exists on the
poster server's disk, which it won't from your sandbox. Use `imageBase64`.

## 4. Workflow you should implement

Replace the previous Zapier-based scheduled task with this:

**Trigger:** scheduled task running on the same cadence as before (daily at
e.g. 07:30 Riga time, before the typical 08:00 post slot).

**Steps:**

1. `GET /api/status` — confirm `linkedin.connected === true` and no critical
   warnings. If unhealthy, abort and alert Maris.

2. List markdown files in `/MarisOS/LinkedIn Content/Approved/`.

3. For each file due to post in the next ~24 hours:
   - Parse the markdown for: post text, image path (relative to MarisOS),
     first-comment text, scheduled date/time.
   - Read the image file from disk, base64-encode it.
   - Call `POST /api/schedule` with the JSON body shown above.
   - On `200 OK`: move the markdown file from `/Approved/` to `/Queued/`.
     Append the returned `queueId` to the markdown front-matter so it can be
     cancelled later if needed.
   - On non-2xx: log the error, leave the file in `/Approved/`, alert Maris.

4. `GET /api/queue` and check for any items in `failed` status from previous
   runs. Surface those to Maris with the error message.

## 5. Failure handling

The poster service handles its own retry-once policy. You do not need to
implement retries on top.

What you DO need to do:

- **5xx response from the poster API**: log + alert Maris. The post is not
  queued. Leave the markdown in `/Approved/`.
- **Network error / timeout**: same as above.
- **Failed item visible in `/api/queue`**: a previously queued post hit both
  retries and gave up. Pull `lastError` and surface to Maris.
- **`linkedin.connected: false` in status**: the LinkedIn token is invalid
  (expired, revoked, or never set). All scheduled posts will fail until Maris
  re-auths. Alert immediately.

## 6. Re-auth process (60-day cycle)

LinkedIn issues 60-day access tokens with no refresh-token support for this
app type. Every ~60 days Maris must:

1. Open `https://poster.thetrustsequence.com/auth/login` in a browser.
2. Click "Allow" on the LinkedIn consent page.
3. Land back on a page saying "Connected".

**Current token expiry:** Wed 24 Jun 2026 (re-auth before then).

Your job: surface the warning when `expiresInDays < 14` so Maris doesn't miss
the window. The cleanest signal is to add a check to your daily status pull
and alert via whatever channel you already use for Maris notifications.

## 7. Quick smoke test

Before relying on the integration in production, run one end-to-end test:

```bash
curl -X POST https://poster.thetrustsequence.com/api/schedule \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Cowork integration smoke test — please ignore. Will be deleted.",
    "firstComment": "Test comment.",
    "visibility": "CONNECTIONS",
    "scheduledAt": "<ISO 8601 timestamp ~3 minutes from now>"
  }'
```

Wait for the post to fire (check `lastPost` in `/api/status`), verify it
appeared on Maris's LinkedIn feed, then delete it from LinkedIn manually.

Once that round-trips successfully, you're integrated.

## 8. Where to find things

- **Codebase:** `/MarisOS/linkedin-poster/` (this repo). Source in `src/`.
- **API contract:** this file.
- **API key:** delivered via your secrets mechanism (ask Maris).
- **Server:** Hetzner box, IP `89.167.58.207`. Maris and Claude Code manage
  it; you don't need SSH access.
- **Logs:** Maris can pull them with `journalctl -u linkedin-poster -n 50` if
  something looks off; you can ask via him.
