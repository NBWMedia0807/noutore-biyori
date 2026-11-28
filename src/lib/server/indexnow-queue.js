// IndexNow への送信を、バーストでも 1 本の POST にまとめ、同じ URL の再送と 429 の連打を避ける。
// 状態はこの isolate のメモリだけを使う。定期実行は足さない。
//
// Workers では、打ち切られたリクエストの Promise は解決も reject もされず finally も走らない。
// そのため drain の Promise や timer はリクエスト間で共有しない。
// - kick ごとに自分の drain を持ち、待ちと送信を合わせて MAX_DRAIN_MS 以内に終える
// - 共有するのは送信中の batch と期限（active）という素のデータだけ。待ち中は active を持たない
// - 期限を過ぎた active は次の enqueue / kick が外し、batch をキューへ戻す

// waitUntil の猶予（約 30 秒）より短い 25 秒未満に収める。
export const MAX_DRAIN_MS = 24_000;
const MIN_SEND_MS = 2000;
const POLL_MS = 500;
const LEASE_GRACE_MS = 1000;
// 同じ batch を送り直しても通らない応答。
const REJECTED_STATUSES = new Set([400, 403, 422]);

const DEFAULTS = {
  dedupeWindowMs: 10 * 60 * 1000,
  minIntervalMs: 10 * 1000,
  flushDelayMs: 500,
  defaultBackoffMs: 60 * 1000,
  maxBackoffMs: 10 * 60 * 1000,
  submitTimeoutMs: 5000,
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

// 呼び出したリクエスト自身の timer で打ち切る。
const submitWithTimeout = async (submit, batch, timeoutMs) => {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`IndexNow request timed out after ${timeoutMs}ms`));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([submit(batch, { signal: controller.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const createIndexNowScheduler = (options = {}) => {
  const cfg = { ...DEFAULTS, ...options };
  const now = cfg.now ?? (() => Date.now());
  const sleep = cfg.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const submittedAt = new Map();
  let pending = [];
  const pendingSet = new Set();
  // 一度拒否された batch の URL。新しい URL を先に送り、これらは 1 件ずつ確かめる。
  const suspects = new Set();
  let backoffUntil = 0;
  let lastSubmitAt = 0;
  let active = null;

  const pruneSubmitted = (at) => {
    if (submittedAt.size < 2000) return;
    for (const [url, seen] of submittedAt) {
      if (at - seen >= cfg.dedupeWindowMs) submittedAt.delete(url);
    }
  };

  const restore = (batch) => {
    const kept = batch.filter((url) => !pendingSet.has(url));
    pending = kept.concat(pending);
    for (const url of kept) pendingSet.add(url);
  };

  const releaseExpired = () => {
    if (!active || now() < active.expiresAt) return;
    restore(active.batch);
    active = null;
  };

  const enqueue = (urls) => {
    releaseExpired();
    const at = now();
    pruneSubmitted(at);
    const accepted = [];
    const deduped = [];
    for (const url of normalizeUrls(urls)) {
      const seen = submittedAt.get(url);
      if (
        (seen != null && at - seen < cfg.dedupeWindowMs) ||
        pendingSet.has(url) ||
        active?.batch.includes(url) ||
        pending.length >= cfg.maxUrls
      ) {
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
    const fresh = pending.filter((url) => !suspects.has(url)).slice(0, cfg.maxUrls);
    const batch = fresh.length > 0 ? fresh : pending.slice(0, 1);
    const taken = new Set(batch);
    pending = pending.filter((url) => !taken.has(url));
    for (const url of batch) pendingSet.delete(url);
    return batch;
  };

  const skipped = (reason, extra = {}) => ({
    ok: true,
    skipped: true,
    reason,
    submitted: 0,
    queued: pending.length,
    ...extra,
  });

  const onThrottled = (batch, retryAfter) => {
    restore(batch);
    const at = now();
    const retryMs = parseRetryAfterMs(retryAfter, at, {
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
  };

  const onRejected = (batch, status) => {
    lastSubmitAt = now();
    if (batch.length === 1) {
      suspects.delete(batch[0]);
      console.error('[indexnow] dropped rejected url', { status, url: batch[0] });
    } else {
      restore(batch);
      for (const url of batch) suspects.add(url);
      console.warn('[indexnow] batch rejected, retrying one by one', { status, size: batch.length });
    }
    return skipped('rejected', { status });
  };

  const onFailed = (batch, backoffMs, extra) => {
    restore(batch);
    backoffUntil = now() + backoffMs;
    return skipped('error-backoff', extra);
  };

  const onSubmitted = (batch, status) => {
    const at = now();
    lastSubmitAt = at;
    for (const url of batch) {
      submittedAt.set(url, at);
      suspects.delete(url);
    }
    console.log(`[indexnow] Submitted ${batch.length} URL(s).`);
    return { ok: true, status: status ?? 200, submitted: batch.length, queued: pending.length };
  };

  const sendNext = async (submit, timeoutMs) => {
    const batch = takeBatch();
    const run = { batch, expiresAt: now() + timeoutMs + LEASE_GRACE_MS };
    active = run;
    try {
      const result = await submitWithTimeout(submit, batch, timeoutMs);
      if (result?.ok) return onSubmitted(batch, result.status);
      if (result?.status === 429) return onThrottled(batch, result.retryAfter);
      if (REJECTED_STATUSES.has(result?.status)) return onRejected(batch, result.status);
      console.error('[indexnow] API returned', result?.status);
      return onFailed(batch, Math.min(cfg.defaultBackoffMs, 30_000), { status: result?.status });
    } catch (error) {
      console.error('[indexnow] request failed', error);
      return onFailed(batch, cfg.defaultBackoffMs);
    } finally {
      if (active === run) active = null;
    }
  };

  const drain = async (submit) => {
    const deadline = now() + MAX_DRAIN_MS;
    await sleep(Math.min(cfg.flushDelayMs, MAX_DRAIN_MS));

    let last = null;
    for (;;) {
      releaseExpired();
      if (pending.length === 0) return last ?? skipped('empty');

      const at = now();
      // Retry-After は記録するだけで待たない。次の kick に任せる。
      if (at < backoffUntil) {
        return last?.throttled ? last : skipped('backoff', { retryAt: backoffUntil });
      }

      let waitMs = 0;
      if (active) waitMs = POLL_MS;
      else if (lastSubmitAt) waitMs = Math.max(0, lastSubmitAt + cfg.minIntervalMs - at);

      const remaining = deadline - at;
      if (waitMs + MIN_SEND_MS > remaining) return skipped('budget');
      if (waitMs > 0) {
        await sleep(waitMs);
        continue;
      }

      last = await sendNext(submit, Math.min(cfg.submitTimeoutMs, remaining));
      if (last.throttled || last.reason === 'error-backoff') return last;
    }
  };

  const kick = (submit, waitUntil) => {
    const task = drain(submit);
    if (typeof waitUntil === 'function') {
      waitUntil(task.catch((error) => console.error('[indexnow] drain failed', error)));
    }
    return task;
  };

  return {
    enqueue,
    kick,
    pendingCount: () => pending.length,
  };
};
