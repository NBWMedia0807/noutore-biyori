// 関連記事（relatedArticles）の更新。
//
// 以前は Sanity の publish webhook のたびに全 quiz を取得し、1 トランザクションで
// 全件 patch していた。公開が続くと Worker の CPU 時間を使い切り HTTP 503 になる。
// ここでは次のように分割する。
// - 変えるのは公開ドキュメントのカテゴリだけ（全データセットは走査しない）
// - 1 リクエストでは先頭ウィンドウか、最大 PAGE_SIZE 件だけを書く
// - 続きは waitUntil から自分自身を呼び、呼び出しごとに CPU 予算を分ける
// - 同じカテゴリのバーストはロックで 1 本にまとめ、公開ドキュメントだけは先に直す
// ルールは従来どおり「同じカテゴリの新しい順 5 件（自分以外）」。

export const RELATED_LIMIT = 5;
export const TOP_WINDOW = RELATED_LIMIT + 1;
export const PAGE_SIZE = 40;
export const MAX_PAGES = 500;
export const MAX_OFFSET = 20000;
export const LOCK_TTL_MS = 180_000;
export const MAX_CATEGORY_KEYS = 4;
export const MAX_DOCUMENT_IDS = 8;

const BASE_FILTER = `_type == "quiz" &&
  !(_id in path("drafts.**")) &&
  isRepublished != true &&
  coalesce(reviewStatus, "approved") != "retracted"`;

const categoryPredicate = (keyType) =>
  keyType === 'prefix'
    ? `!defined(category._ref) && (slug.current == $categoryKey || string::startsWith(slug.current, $categoryKey + "/"))`
    : `category._ref == $categoryKey`;

export const categorySliceQuery = (keyType) => `*[
  ${BASE_FILTER} &&
  ${categoryPredicate(keyType)}
] | order(publishedAt desc) [$start...$end] {
  _id,
  "slug": slug.current,
  "categoryRef": category._ref,
  publishedAt,
  "relatedRefs": relatedArticles[]._ref
}`;

export const DOC_QUERY = `*[_id == $id && _type == "quiz"][0]{
  _id,
  _type,
  "slug": slug.current,
  "categoryRef": category._ref
}`;

export const categoryMemberQuery = (keyType) => `*[
  ${BASE_FILTER} &&
  ${categoryPredicate(keyType)} &&
  _id == $id
][0]{
  _id,
  "relatedRefs": relatedArticles[]._ref
}`;

export const slugPrefix = (slug) => {
  if (typeof slug !== 'string' || !slug) return null;
  const prefix = slug.split('/')[0];
  return prefix || null;
};

export const categoryKeyFromDoc = (doc) => {
  if (!doc || typeof doc !== 'object') return null;
  if (doc._type && doc._type !== 'quiz') return null;
  if (typeof doc.categoryRef === 'string' && doc.categoryRef) {
    return { keyType: 'ref', categoryKey: doc.categoryRef };
  }
  const category = doc.category;
  if (
    category &&
    typeof category === 'object' &&
    typeof category._ref === 'string' &&
    category._ref
  ) {
    return { keyType: 'ref', categoryKey: category._ref };
  }
  if (typeof category === 'string' && category) {
    return { keyType: 'ref', categoryKey: category };
  }
  const slug = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current;
  const prefix = slugPrefix(slug);
  if (!prefix) return null;
  return { keyType: 'prefix', categoryKey: prefix };
};

const normalizeId = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('drafts.') ? trimmed.slice('drafts.'.length) : trimmed;
};

const addId = (ids, value) => {
  const id = normalizeId(value);
  if (!id || ids.includes(id)) return;
  ids.push(id);
};

const collectIds = (payload, headers) => {
  const ids = [];
  const walk = (value) => {
    if (typeof value === 'string') {
      addId(ids, value);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (typeof value._id === 'string') addId(ids, value._id);
    if (typeof value.documentId === 'string') addId(ids, value.documentId);
  };

  walk(payload);
  for (const slot of ['document', 'after', 'current', 'previous', 'before', 'payload', 'result']) {
    walk(payload?.[slot]);
  }
  if (Array.isArray(payload?.ids)) {
    for (const entry of payload.ids) {
      if (typeof entry === 'string') addId(ids, entry);
      else if (entry && typeof entry === 'object') Object.values(entry).forEach(walk);
    }
  }
  for (const bucket of ['created', 'updated', 'deleted']) {
    const list = payload?.ids?.[bucket];
    if (Array.isArray(list)) list.forEach(walk);
  }
  if (headers && typeof headers.get === 'function') {
    const raw = headers.get('sanity-document-id');
    if (raw) raw.split(/[,\s]+/).forEach((part) => addId(ids, part));
  }
  return ids;
};

const firstType = (payload) => {
  const candidates = [
    payload?._type,
    payload?.document?._type,
    payload?.after?._type,
    payload?.current?._type,
  ];
  for (const type of candidates) {
    if (typeof type === 'string' && type.trim()) return type.trim();
  }
  return '';
};

export const extractUpdateTargets = (payload, headers) => {
  const type = firstType(payload);
  if (type && type !== 'quiz') {
    return { skip: true, message: `Skipped: _type=${type}`, keys: [], ids: [] };
  }

  const keys = [];
  const seen = new Set();
  const addKey = (key) => {
    if (!key?.categoryKey || (key.keyType !== 'ref' && key.keyType !== 'prefix')) return;
    const id = `${key.keyType}:${key.categoryKey}`;
    if (seen.has(id)) return;
    seen.add(id);
    keys.push({ keyType: key.keyType, categoryKey: key.categoryKey });
  };

  addKey(categoryKeyFromDoc(payload));
  for (const slot of ['document', 'after', 'current', 'previous', 'before', 'payload', 'result']) {
    addKey(categoryKeyFromDoc(payload?.[slot]));
  }

  return {
    skip: false,
    keys: keys.slice(0, MAX_CATEGORY_KEYS),
    ids: collectIds(payload, headers).slice(0, MAX_DOCUMENT_IDS),
    truncated: keys.length > MAX_CATEGORY_KEYS,
  };
};

export const toRelatedReferences = (ids) =>
  ids.map((id, index) => ({
    _type: 'reference',
    _ref: id,
    _key: `related-${index}`,
  }));

export const relatedForDocument = (docId, orderedIds) => {
  const picked = [];
  for (const id of orderedIds) {
    if (!id || id === docId) continue;
    picked.push(id);
    if (picked.length === RELATED_LIMIT) break;
  }
  if (picked.length === 0) return null;
  return toRelatedReferences(picked);
};

export const sameRelated = (currentRefs, next) => {
  if (!next || !Array.isArray(currentRefs) || currentRefs.length !== next.length) return false;
  for (let index = 0; index < next.length; index += 1) {
    if (currentRefs[index] !== next[index]._ref) return false;
  }
  return true;
};

const normalizeDocs = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((doc) => doc && typeof doc._id === 'string' && doc._id);
};

export const patchesForDocuments = (docs, orderedTopIds) => {
  const topSet = new Set(orderedTopIds);
  const tailIds = orderedTopIds.slice(0, RELATED_LIMIT);
  const patches = [];
  for (const doc of docs) {
    if (!doc?._id) continue;
    const context = topSet.has(doc._id) ? orderedTopIds : tailIds;
    const related = relatedForDocument(doc._id, context);
    if (!related || sameRelated(doc.relatedRefs, related)) continue;
    patches.push({ id: doc._id, related });
  }
  return patches;
};

export const commitRelatedPatches = async (client, patches) => {
  if (!patches.length) return;
  let tx = client.transaction();
  for (const patch of patches) {
    tx = tx.patch(patch.id, (builder) => builder.set({ relatedArticles: patch.related }));
  }
  await tx.commit();
};

const fetchSlice = async (client, keyType, categoryKey, start, end) => {
  const rows = await client.fetch(categorySliceQuery(keyType), { categoryKey, start, end });
  return normalizeDocs(rows);
};

export const runRelatedPage = async (client, { keyType, categoryKey, offset, pageSize }) => {
  const size = Math.min(PAGE_SIZE, Math.max(1, pageSize || PAGE_SIZE));
  const start = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  // 先頭は常に取り直す。ページサイズよりカテゴリが長くても「新しい順 5 件」が欠けない。
  const top = await fetchSlice(client, keyType, categoryKey, 0, TOP_WINDOW);
  const orderedTopIds = top.map((doc) => doc._id);
  if (orderedTopIds.length === 0) {
    return { done: true, updated: 0, examined: 0, nextOffset: start };
  }

  const entireCategory = top.length < TOP_WINDOW;
  const page =
    start === 0 && entireCategory
      ? top
      : await fetchSlice(client, keyType, categoryKey, start, start + size);

  if (page.length === 0) {
    return { done: true, updated: 0, examined: 0, nextOffset: start };
  }

  const patches = patchesForDocuments(page, orderedTopIds);
  await commitRelatedPatches(client, patches);
  const done = start === 0 && entireCategory ? true : page.length < size;
  return {
    done,
    updated: patches.length,
    examined: page.length,
    nextOffset: start + page.length,
  };
};

export const runRelatedHead = async (client, { keyType, categoryKey, documentId }) => {
  const top = await fetchSlice(client, keyType, categoryKey, 0, TOP_WINDOW);
  const orderedTopIds = top.map((doc) => doc._id);
  const docs = [...top];
  if (documentId && !orderedTopIds.includes(documentId) && orderedTopIds.length > 0) {
    const extra = await client.fetch(categoryMemberQuery(keyType), { categoryKey, id: documentId });
    if (extra?._id) docs.push(extra);
  }
  const patches = patchesForDocuments(docs, orderedTopIds);
  await commitRelatedPatches(client, patches);
  return { updated: patches.length, examined: docs.length };
};

const lockRequest = (kind, lockKey) =>
  new Request(`https://update-related.internal/${kind}/${encodeURIComponent(lockKey)}`);

const readLock = async (cache, request, now) => {
  const res = await cache.match(request);
  if (!res) return null;
  try {
    const data = await res.json();
    if (!data || typeof data.touchedAt !== 'number' || now - data.touchedAt > LOCK_TTL_MS) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const writeLock = async (cache, request, data) => {
  await cache.put(
    request,
    new Response(JSON.stringify(data), {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${Math.ceil(LOCK_TTL_MS / 1000)}`,
      },
    })
  );
};

const cacheUsable = (cache) =>
  Boolean(cache && typeof cache.match === 'function' && typeof cache.put === 'function');

export const claimCategoryRun = async (cache, lockKey, now = Date.now()) => {
  if (!cacheUsable(cache)) return { start: true, gen: 1, coalesced: false };
  try {
    const genReq = lockRequest('gen', lockKey);
    const runReq = lockRequest('run', lockKey);
    const genState = await readLock(cache, genReq, now);
    const running = await readLock(cache, runReq, now);
    const gen = (genState?.gen ?? 0) + 1;
    await writeLock(cache, genReq, { gen, touchedAt: now });
    if (running?.running) return { start: false, gen, coalesced: true };
    await writeLock(cache, runReq, { running: true, touchedAt: now });
    return { start: true, gen, coalesced: false };
  } catch (error) {
    console.error('[update-related] lock claim failed', error);
    return { start: true, gen: 1, coalesced: false };
  }
};

export const finishCategoryRun = async (cache, lockKey, startGen, now = Date.now()) => {
  if (!cacheUsable(cache)) return { again: false, gen: startGen };
  try {
    const genReq = lockRequest('gen', lockKey);
    const runReq = lockRequest('run', lockKey);
    const genNow = (await readLock(cache, genReq, now))?.gen ?? startGen;
    if (genNow !== startGen) {
      await writeLock(cache, runReq, { running: true, touchedAt: now });
      return { again: true, gen: genNow };
    }
    await writeLock(cache, runReq, { running: false, touchedAt: now });
    const genAfter = (await readLock(cache, genReq, now))?.gen ?? startGen;
    if (genAfter !== startGen) {
      await writeLock(cache, runReq, { running: true, touchedAt: now });
      return { again: true, gen: genAfter };
    }
    return { again: false, gen: startGen };
  } catch (error) {
    console.error('[update-related] lock finish failed', error);
    return { again: false, gen: startGen };
  }
};

export const releaseCategoryRun = async (cache, lockKey, now = Date.now()) => {
  if (!cacheUsable(cache)) return;
  try {
    await writeLock(cache, lockRequest('run', lockKey), { running: false, touchedAt: now });
  } catch (error) {
    console.error('[update-related] lock release failed', error);
  }
};

const json = (body, status = 200) => Response.json(body, { status });

const resolveWaitUntil = (platform) => {
  const ctx = platform?.ctx || platform?.context;
  if (ctx && typeof ctx.waitUntil === 'function') {
    return (promise) => ctx.waitUntil(promise);
  }
  return null;
};

const resolveInvoke = (event, deps) => {
  if (typeof deps.invoke === 'function') return deps.invoke;
  const binding = event.platform?.env?.SELF;
  if (binding && typeof binding.fetch === 'function') {
    return (request) => binding.fetch(request);
  }
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  return (request) => fetchImpl(request);
};

const lockIdOf = (job) => `${job.keyType}:${job.categoryKey}`;

const scheduleJob = async (job, { origin, secret, invoke, waitUntil }) => {
  const target = new URL('/api/update-related', origin);
  const request = new Request(target, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sanity-webhook-secret': secret,
    },
    body: JSON.stringify({ _updateRelated: job }),
  });
  const run = Promise.resolve()
    .then(() => invoke(request))
    .then(async (res) => {
      if (res && !res.ok) {
        console.error('[update-related] continuation status', res.status);
      }
      await res?.body?.cancel?.().catch?.(() => {});
    })
    .catch((error) => {
      console.error('[update-related] continuation failed', error);
    });
  if (typeof waitUntil === 'function') {
    waitUntil(run);
    return { deferred: true };
  }
  await run;
  return { deferred: false };
};

const continuePages = async ({ job, client, cache, waitUntil, invoke, origin, secret }) => {
  const offset = Number.isInteger(job.offset) && job.offset >= 0 ? job.offset : 0;
  const page = Number.isInteger(job.page) && job.page >= 0 ? job.page : 0;
  const lockKey = lockIdOf(job);
  if (page > MAX_PAGES || offset > MAX_OFFSET) {
    await releaseCategoryRun(cache, lockKey);
    console.error('[update-related] stopped at cap', { lockKey, page, offset });
    return json({ ok: true, done: true, reason: 'cap' });
  }

  const result = await runRelatedPage(client, {
    keyType: job.keyType,
    categoryKey: job.categoryKey,
    offset,
    pageSize: job.pageSize,
  });
  console.log('[update-related] page', {
    categoryKey: job.categoryKey,
    offset,
    examined: result.examined,
    updated: result.updated,
    done: result.done,
  });

  if (!result.done && result.nextOffset > offset) {
    await scheduleJob(
      { ...job, v: 1, phase: 'page', offset: result.nextOffset, page: page + 1 },
      { origin, secret, invoke, waitUntil }
    );
    return json({ ok: true, ...result, offset });
  }

  const fin = await finishCategoryRun(cache, lockKey, job.gen);
  if (fin.again) {
    await scheduleJob(
      { ...job, v: 1, phase: 'page', offset: 0, page: 0, gen: fin.gen },
      { origin, secret, invoke, waitUntil }
    );
  }
  return json({ ok: true, done: true, ...result });
};

const handleJob = async ({ job, client, cache, waitUntil, invoke, origin, secret }) => {
  if (job.phase === 'resolve') {
    const id = typeof job.documentId === 'string' ? job.documentId : '';
    if (!id) return json({ ok: true, done: true, reason: 'no-document' });
    const doc = await client.fetch(DOC_QUERY, { id });
    const key = categoryKeyFromDoc(doc);
    if (!key) return json({ ok: true, done: true, reason: 'no-category' });
    const claim = await claimCategoryRun(cache, lockIdOf(key));
    if (!claim.start) {
      await scheduleJob(
        { v: 1, phase: 'head', ...key, documentId: id },
        { origin, secret, invoke, waitUntil }
      );
      return json({ ok: true, coalesced: true });
    }
    return continuePages({
      job: {
        v: 1,
        phase: 'page',
        ...key,
        offset: 0,
        page: 0,
        gen: claim.gen,
        pageSize: job.pageSize,
      },
      client,
      cache,
      waitUntil,
      invoke,
      origin,
      secret,
    });
  }

  if (job.phase === 'head') {
    if (!job.categoryKey || (job.keyType !== 'ref' && job.keyType !== 'prefix')) {
      return json({ ok: true, done: true, reason: 'no-category' });
    }
    const result = await runRelatedHead(client, job);
    console.log('[update-related] head', {
      categoryKey: job.categoryKey,
      updated: result.updated,
    });
    return json({ ok: true, ...result });
  }

  if (job.phase === 'page') {
    if (!job.categoryKey || (job.keyType !== 'ref' && job.keyType !== 'prefix')) {
      return json({ ok: true, done: true, reason: 'no-category' });
    }
    return continuePages({ job, client, cache, waitUntil, invoke, origin, secret });
  }

  return json({ ok: true, done: true, reason: 'unknown-phase' });
};

const createWriteClient = (deps, env) =>
  deps.createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET || 'production',
    apiVersion: env.SANITY_API_VERSION || '2024-01-01',
    token:
      env.SANITY_WRITE_TOKEN ||
      env.SANITY_AUTH_TOKEN ||
      env.SANITY_DEPLOY_TOKEN ||
      env.SANITY_API_TOKEN,
    useCdn: false,
  });

export const handleUpdateRelatedPost = async (event, deps = {}) => {
  const env = deps.env ?? {};
  const secret = env.SANITY_REVALIDATE_SECRET || env.VERCEL_REVALIDATE_TOKEN || '';
  if (!secret) {
    console.error('[update-related] SANITY_REVALIDATE_SECRET が設定されていません。');
    return json({ ok: false, message: 'Server misconfiguration' }, 500);
  }

  const provided =
    event.url.searchParams.get('secret') || event.request.headers.get('x-sanity-webhook-secret');
  if (!provided || provided !== secret) {
    return json({ ok: false, message: 'Unauthorized' }, 401);
  }

  let payload;
  try {
    payload = await event.request.json();
  } catch {
    return json({ ok: false, message: 'Invalid JSON' }, 400);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ ok: false, message: 'Invalid JSON' }, 400);
  }

  const token =
    env.SANITY_WRITE_TOKEN ||
    env.SANITY_AUTH_TOKEN ||
    env.SANITY_DEPLOY_TOKEN ||
    env.SANITY_API_TOKEN;
  if (!token) {
    console.error('[update-related] 書き込みトークンが設定されていません。');
    return json({ ok: false, message: 'Write token not configured' }, 500);
  }
  if (!env.SANITY_PROJECT_ID) {
    console.error('[update-related] SANITY_PROJECT_ID が設定されていません。');
    return json({ ok: false, message: 'Server misconfiguration' }, 500);
  }

  const waitUntil = deps.waitUntil ?? resolveWaitUntil(event.platform);
  const cache = deps.cache ?? event.platform?.caches?.default ?? null;
  const invoke = resolveInvoke(event, deps);
  const origin = event.url.origin;
  const job = payload._updateRelated;

  if (job?.v === 1) {
    const client = createWriteClient(deps, env);
    try {
      return await handleJob({ job, client, cache, waitUntil, invoke, origin, secret });
    } catch (error) {
      console.error('[update-related] failed', error);
      if (job.categoryKey && job.keyType) await releaseCategoryRun(cache, lockIdOf(job));
      return json({ ok: false, message: error?.message || 'Update failed' }, 500);
    }
  }

  const target = extractUpdateTargets(payload, event.request.headers);
  if (target.skip) return json({ ok: true, message: target.message });
  if (target.keys.length === 0 && target.ids.length === 0) {
    console.log('[update-related] skipped: no document id');
    return json({ ok: true, skipped: true, reason: 'no-document' });
  }

  let started = 0;
  let coalesced = 0;
  const tasks = [];
  if (target.keys.length > 0) {
    for (const key of target.keys) {
      const claim = await claimCategoryRun(cache, lockIdOf(key));
      if (!claim.start) {
        coalesced += 1;
        tasks.push(
          scheduleJob(
            {
              v: 1,
              phase: 'head',
              ...key,
              documentId: target.ids[0],
            },
            { origin, secret, invoke, waitUntil }
          )
        );
        continue;
      }
      started += 1;
      tasks.push(
        scheduleJob(
          { v: 1, phase: 'page', ...key, offset: 0, page: 0, gen: claim.gen },
          { origin, secret, invoke, waitUntil }
        )
      );
    }
  } else {
    started = target.ids.length;
    for (const documentId of target.ids) {
      tasks.push(
        scheduleJob({ v: 1, phase: 'resolve', documentId }, { origin, secret, invoke, waitUntil })
      );
    }
  }

  await Promise.all(tasks);
  console.log('[update-related] queued', { started, coalesced });
  return json({ ok: true, queued: true, started, coalesced });
};
