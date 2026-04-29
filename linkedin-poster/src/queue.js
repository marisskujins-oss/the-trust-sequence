const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const linkedin = require('./linkedin');

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUEUE_PATH = path.join(DATA_DIR, 'queue.json');
const LOG_PATH = path.join(DATA_DIR, 'post-log.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

const TICK_INTERVAL_MS = 60 * 1000;
const RETRY_DELAY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 2;

let processing = false;

async function loadQueue() {
  try {
    const data = await fs.readFile(QUEUE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return { items: [] };
    throw e;
  }
}

async function saveQueue(queue) {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2), { mode: 0o600 });
}

async function appendLog(entry) {
  let log;
  try {
    const data = await fs.readFile(LOG_PATH, 'utf8');
    log = JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') log = { entries: [] };
    else throw e;
  }
  log.entries.push(entry);
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), { mode: 0o600 });
}

function generateId() {
  return 'q_' + crypto.randomBytes(6).toString('hex');
}

async function persistInlineImage(item) {
  if (!item.imageBase64 || item.imagePath) return;
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const imagePath = path.join(IMAGES_DIR, `${item.id}.bin`);
  await fs.writeFile(imagePath, Buffer.from(item.imageBase64, 'base64'), { mode: 0o600 });
  item.imagePath = imagePath;
  item.imageBase64 = null;
  item.ownsImage = true;
}

async function maybeCleanupImage(item) {
  if (!item.ownsImage || !item.imagePath) return;
  if (!item.imagePath.startsWith(IMAGES_DIR)) return;
  try {
    await fs.unlink(item.imagePath);
  } catch (_) {}
}

async function enqueue({ text, imagePath, imageBase64, firstComment, altText, visibility, scheduledAt }) {
  if (!text) throw new Error('text_required');
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime())) throw new Error('invalid_scheduledAt');

  const queue = await loadQueue();
  const id = generateId();
  const item = {
    id,
    createdAt: new Date().toISOString(),
    scheduledAt: when.toISOString(),
    status: 'queued',
    text,
    imagePath: imagePath || null,
    imageBase64: imageBase64 || null,
    ownsImage: false,
    firstComment: firstComment || null,
    altText: altText || null,
    visibility: visibility || null,
    attempts: 0,
    lastError: null,
    nextAttemptAt: when.toISOString(),
    postUrn: null,
    postUrl: null,
    postedAt: null,
  };
  await persistInlineImage(item);
  queue.items.push(item);
  await saveQueue(queue);
  return item;
}

async function listQueue() {
  const queue = await loadQueue();
  return queue.items.map(redactItem);
}

function redactItem(item) {
  const { imageBase64, ...rest } = item;
  return rest;
}

async function cancel(id) {
  const queue = await loadQueue();
  const idx = queue.items.findIndex((i) => i.id === id);
  if (idx === -1) return { found: false };
  const item = queue.items[idx];
  if (item.status === 'firing') {
    return { found: true, cancelled: false, reason: 'currently_firing' };
  }
  if (item.status === 'posted') {
    return { found: true, cancelled: false, reason: 'already_posted' };
  }
  await maybeCleanupImage(item);
  queue.items.splice(idx, 1);
  await saveQueue(queue);
  return { found: true, cancelled: true, item: redactItem(item) };
}

async function processOne(item) {
  try {
    let imageBuffer = null;
    if (item.imagePath) {
      imageBuffer = await fs.readFile(item.imagePath);
    } else if (item.imageBase64) {
      imageBuffer = Buffer.from(item.imageBase64, 'base64');
    }
    const result = await linkedin.publishPost({
      text: item.text,
      imageBuffer,
      altText: item.altText,
      firstComment: item.firstComment,
      visibility: item.visibility,
    });
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function tick() {
  if (processing) return;
  processing = true;
  try {
    const now = Date.now();
    const queue = await loadQueue();
    const due = queue.items.find(
      (i) =>
        (i.status === 'queued' || i.status === 'pending_retry') &&
        new Date(i.nextAttemptAt).getTime() <= now
    );
    if (!due) return;

    due.status = 'firing';
    await saveQueue(queue);

    const result = await processOne(due);

    const queue2 = await loadQueue();
    const item = queue2.items.find((i) => i.id === due.id);
    if (!item) return;
    item.attempts += 1;

    if (result.success) {
      item.status = 'posted';
      item.postUrn = result.postUrn;
      item.postUrl = result.postUrl;
      item.postedAt = new Date().toISOString();
      item.lastError = null;
      await saveQueue(queue2);
      await appendLog({
        queueId: item.id,
        scheduledAt: item.scheduledAt,
        postedAt: item.postedAt,
        postUrn: result.postUrn,
        postUrl: result.postUrl,
        imageUrn: result.imageUrn,
        commentUrn: result.commentUrn,
        commentError: result.commentError,
        commentRetries: result.commentRetries || 0,
        success: true,
        error: null,
      });
      await maybeCleanupImage(item);
      console.log(`[scheduler] posted ${item.id} -> ${result.postUrl}`);
    } else {
      item.lastError = result.error;
      if (item.attempts < MAX_ATTEMPTS) {
        item.status = 'pending_retry';
        item.nextAttemptAt = new Date(Date.now() + RETRY_DELAY_MS).toISOString();
        await saveQueue(queue2);
        console.warn(
          `[scheduler] failed ${item.id} (attempt ${item.attempts}/${MAX_ATTEMPTS}): ${result.error} — retry at ${item.nextAttemptAt}`
        );
      } else {
        item.status = 'failed';
        await saveQueue(queue2);
        await appendLog({
          queueId: item.id,
          scheduledAt: item.scheduledAt,
          postedAt: null,
          postUrn: null,
          postUrl: null,
          imageUrn: null,
          commentUrn: null,
          commentError: null,
          success: false,
          error: result.error,
        });
        console.error(`[scheduler] permanently failed ${item.id}: ${result.error}`);
      }
    }
  } catch (err) {
    console.error('[scheduler] tick error:', err);
  } finally {
    processing = false;
  }
}

async function recoverInterrupted() {
  const queue = await loadQueue();
  let changed = false;
  for (const item of queue.items) {
    if (item.status === 'firing') {
      item.status = 'queued';
      item.nextAttemptAt = new Date().toISOString();
      console.warn(`[scheduler] recovered interrupted item ${item.id}`);
      changed = true;
    }
  }
  if (changed) await saveQueue(queue);
}

async function startScheduler() {
  await recoverInterrupted();
  tick().catch((err) => console.error('initial tick error:', err));
  setInterval(() => {
    tick().catch((err) => console.error('tick error:', err));
  }, TICK_INTERVAL_MS);
  console.log(`[scheduler] started — checking queue every ${TICK_INTERVAL_MS / 1000}s`);
}

async function queueCount() {
  const queue = await loadQueue();
  return queue.items.filter(
    (i) => i.status === 'queued' || i.status === 'pending_retry'
  ).length;
}

async function failedCount() {
  const queue = await loadQueue();
  return queue.items.filter((i) => i.status === 'failed').length;
}

async function lastPostInfo() {
  let log;
  try {
    const data = await fs.readFile(LOG_PATH, 'utf8');
    log = JSON.parse(data);
  } catch (e) {
    return null;
  }
  if (!log.entries.length) return null;
  const last = log.entries[log.entries.length - 1];
  return {
    postedAt: last.postedAt,
    postUrl: last.postUrl,
    success: last.success,
  };
}

module.exports = {
  enqueue,
  listQueue,
  cancel,
  startScheduler,
  queueCount,
  failedCount,
  lastPostInfo,
};
