// IndexNow への送信を、バーストでも 1 本の POST にまとめ、同じ URL の再送と 429 の連打を避ける。
// 状態はこの isolate のメモリだけを使う。定期実行は足さない。

const DEFAULTS = {
  dedupeWindowMs: 10 * 60 * 1000,
  minIntervalMs: 10 * 1000,
  flushDelayMs: 500,
  defaultBackoffMs: 60 * 1000,
  maxBackoffMs: 10 * 60 * 1000,
  maxUrls: 10000,
};

export const buildIndexNowRequestBody = ({ urls, key, siteUrl }) => {
  const origin = String(siteUrl).replace(/\/$/, '');
  return {
    host: new URL(origin).hostname,
    key,
    keyLocation: `${origin}/${key}.txt`,
    urlList: urls.slice(0, 10000),
  };
};

export const parseRetryAfterMs = (header, now, { defaultMs, maxMs }) => {
  const clamp = (value) => Math.min(maxMs, Math.max(0, value));
  if (header == null || header === '') return defaultMs;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return clamp(seconds * 1000);
  const date = Date.parse(String(header));
  if (Number.isFinite(date)) return clamp(Math.max(0, date - now));
  return defaultMs;
};

const normalizeUrls = (urls) => {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(urls) ? urls : [];
  for (const url of list) {
    if (typeof url !== 'string' || !url.startsWith('https://') || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
};

export const createIndexNowScheduler = (options = {}) => {
  const cfg = { ...DEFAULTS, ...options };
  const now = cfg.now ?? (() => Date.now());
  const sleep = cfg.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const submittedAt = new Map();
  const pending = [];
  const pendingSet = new Set();
  let backoffUntil = 0;
  let lastSubmitAt = 0;
  let active = null;

  const pruneSubmitted = (at) => {
    if (submittedAt.size < 2000) return;
    for (const [url, seen] of submittedAt) {
      if (at - seen >= cfg.dedupeWindowMs) submittedAt.delete(url);
    }
  };

  const enqueue = (urls) => {
    const at = now();
    pruneSubmitted(at);
    const accepted = [];
    const deduped = [];
    for (const url of normalizeUrls(urls)) {
      const seen = submittedAt.get(url);
      if ((seen != null && at - seen < cfg.dedupeWindowMs) || pendingSet.has(url)) {
        deduped.push(url);
        continue;
      }
      if (pending.length >= cfg.maxUrls) {
        deduped.push(url);
        continue;
      }
      pending.push(url);
      pendingSet.add(url);
      accepted.push(url);
    }
    return { accepted, deduped };
  };

  const takeBatch = () => {
    const batch = pending.splice(0, cfg.maxUrls);
    for (const url of batch) pendingSet.delete(url);
    return batch;
  };

  const restore = (batch) => {
    const kept = batch.filter((url) => !pendingSet.has(url));
    if (kept.length === 0) return;
    pending.unshift(...kept);
    for (const url of kept) pendingSet.add(url);
  };

  const flushOnce = async (submit) => {
    const at = now();
    if (pending.length === 0) {
      return { ok: true, skipped: true, reason: 'empty', submitted: 0, queued: 0 };
    }
    if (at < backoffUntil) {
      return {
        ok: true,
        skipped: true,
        reason: 'backoff',
        retryAt: backoffUntil,
        submitted: 0,
        queued: pending.length,
      };
    }
    if (lastSubmitAt && at - lastSubmitAt < cfg.minIntervalMs) {
      return {
        ok: true,
        skipped: true,
        reason: 'interval',
        submitted: 0,
        queued: pending.length,
      };
    }

    const batch = takeBatch();
    let result;
    try {
      result = await submit(batch);
    } catch (error) {
      restore(batch);
      backoffUntil = at + cfg.defaultBackoffMs;
      console.error('[indexnow] request failed', error);
      return {
        ok: true,
        skipped: true,
        reason: 'error-backoff',
        submitted: 0,
        queued: pending.length,
      };
    }

    if (result?.status === 429) {
      restore(batch);
      const retryMs = parseRetryAfterMs(result.retryAfter, at, {
        defaultMs: cfg.defaultBackoffMs,
        maxMs: cfg.maxBackoffMs,
      });
      backoffUntil = at + Math.max(retryMs, 1000);
      console.warn('[indexnow] 429, backing off', { retryMs, queued: pending.length });
      return {
        ok: true,
        throttled: true,
        status: 429,
        reason: 'backoff',
        submitted: 0,
        queued: pending.length,
      };
    }

    if (!result?.ok) {
      restore(batch);
      backoffUntil = at + Math.min(cfg.defaultBackoffMs, 30_000);
      console.error('[indexnow] API returned', result?.status);
      return {
        ok: true,
        skipped: true,
        status: result?.status,
        reason: 'error-backoff',
        submitted: 0,
        queued: pending.length,
      };
    }

    const doneAt = now();
    lastSubmitAt = doneAt;
    for (const url of batch) submittedAt.set(url, doneAt);
    console.log(`[indexnow] Submitted ${batch.length} URL(s).`);
    return {
      ok: true,
      status: result.status ?? 200,
      submitted: batch.length,
      queued: pending.length,
    };
  };

  const drain = async (submit) => {
    let last = { ok: true, skipped: true, reason: 'empty', submitted: 0, queued: pending.length };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (pending.length === 0) return last;
      const at = now();
      if (at < backoffUntil) return flushOnce(submit);
      if (lastSubmitAt && at - lastSubmitAt < cfg.minIntervalMs) {
        return flushOnce(submit);
      }
      last = await flushOnce(submit);
      if (last.throttled || last.reason === 'backoff' || last.reason === 'error-backoff')
        return last;
      if (last.reason === 'interval') return last;
    }
    return last;
  };

  const kick = (submit, waitUntil) => {
    if (!active) {
      active = sleep(cfg.flushDelayMs)
        .then(() => drain(submit))
        .finally(() => {
          active = null;
        });
    }
    if (typeof waitUntil === 'function') waitUntil(active);
    return active;
  };

  return {
    enqueue,
    kick,
    pendingCount: () => pending.length,
  };
};
