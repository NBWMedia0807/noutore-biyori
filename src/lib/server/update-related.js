// 関連記事（relatedArticles）の更新。
//
// 以前は Sanity の publish webhook のたびに全 quiz を取得し、1 トランザクションで
// 全件 patch していた。公開が続くと Worker の CPU 時間を使い切り HTTP 503 になる。
// ここでは 1 回の webhook で有界な範囲だけを処理し、終えてから応答する。
// - 変えるのは公開ドキュメントと、そのカテゴリ（移動時は旧カテゴリも）の先頭ウィンドウだけ
// - ウィンドウより古い記事は更新しない（意図した妥協）
// - 続きのリクエスト・保存位置・ロックは持たない。失敗したら次の webhook が同じ処理をやり直す
// - このモジュールから自分の origin へ fetch しない（secret を Worker の外へ出さない）
// ルールは従来どおり「同じカテゴリの新しい順 5 件（自分以外）」。

export const RELATED_LIMIT = 5;
export const CATEGORY_WINDOW = 12;
export const REFERENCING_LIMIT = 12;
// この 2 つで 1 回の書き込みは最大 12 × 4 + 4 = 52 件に収まる。
export const MAX_CATEGORY_KEYS = 4;
export const MAX_DOCUMENT_IDS = 4;

const BASE_FILTER = `_type == "quiz" &&
  !(_id in path("drafts.**")) &&
  isRepublished != true &&
  coalesce(reviewStatus, "approved") != "retracted"`;

const categoryPredicate = (keyType) =>
  keyType === 'prefix'
    ? `!defined(category._ref) && (slug.current == $categoryKey || string::startsWith(slug.current, $categoryKey + "/"))`
    : `category._ref == $categoryKey`;

// publishedAt が同時刻・日付だけでも順序が揺れないよう _id を第 2 キーにする。
const NEWEST_FIRST = 'order(publishedAt desc, _id desc)';

export const categoryWindowQuery = (keyType) => `*[
  ${BASE_FILTER} &&
  ${categoryPredicate(keyType)}
] | ${NEWEST_FIRST} [0...${CATEGORY_WINDOW}] {
  _id,
  "relatedRefs": relatedArticles[]._ref
}`;

// カテゴリは payload ではなく現在値を正とする。非公開になった記事の近傍も直すので BASE_FILTER は掛けない。
export const TARGET_DOCS_QUERY = `*[_id in $ids && _type == "quiz"]{
  _id,
  _type,
  "slug": slug.current,
  "categoryRef": category._ref
}`;

export const categoryMemberQuery = (keyType) => `*[
  ${BASE_FILTER} &&
  ${categoryPredicate(keyType)} &&
  _id in $ids
]{
  _id,
  "relatedRefs": relatedArticles[]._ref
}`;

// 現在のカテゴリを除かないと、同カテゴリの参照元だけで上限が埋まり旧カテゴリが見つからない。
const outsideCategory = (keyType) =>
  keyType === 'prefix'
    ? `!(${categoryPredicate(keyType)})`
    : `coalesce(category._ref, "") != $categoryKey`;

export const referencingQuery = (keyType) => `*[
  ${BASE_FILTER} &&
  references($id) &&
  $id in relatedArticles[]._ref${keyType ? ` &&\n  ${outsideCategory(keyType)}` : ''}
] | ${NEWEST_FIRST} [0...${REFERENCING_LIMIT}] {
  _id,
  _type,
  "slug": slug.current,
  "categoryRef": category._ref
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
  for (const slot of PAYLOAD_SLOTS) {
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

const PAYLOAD_SLOTS = ['document', 'after', 'current', 'previous', 'before', 'payload', 'result'];
const PREVIOUS_SLOTS = ['previous', 'before'];

const keyId = (key) => `${key.keyType}:${key.categoryKey}`;

const uniqueKeys = (candidates) => {
  const byId = new Map();
  for (const key of candidates) {
    if (key && !byId.has(keyId(key))) byId.set(keyId(key), key);
  }
  return [...byId.values()];
};

export const extractUpdateTargets = (payload, headers) => {
  const type = firstType(payload);
  if (type && type !== 'quiz') {
    return { skip: true, message: `Skipped: _type=${type}`, keys: [], ids: [] };
  }

  const keys = uniqueKeys(
    [payload, ...PAYLOAD_SLOTS.map((slot) => payload?.[slot])].map(categoryKeyFromDoc)
  );
  const previous = PREVIOUS_SLOTS.map((slot) => payload?.[slot]);

  return {
    skip: false,
    keys: keys.slice(0, MAX_CATEGORY_KEYS),
    previousKeys: uniqueKeys(previous.map(categoryKeyFromDoc)),
    // slug だけの previous では旧カテゴリが分からないので、参照元の検索は省かない。
    hasPreviousCategory: previous.some((doc) => doc?.categoryRef || doc?.category?._ref),
    ids: collectIds(payload, headers).slice(0, MAX_DOCUMENT_IDS),
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
  return toRelatedReferences(picked);
};

// 未設定と空配列は同じ扱い。1 件しかないカテゴリへ移った記事の古い参照は空にする。
export const sameRelated = (currentRefs, next) => {
  const current = Array.isArray(currentRefs) ? currentRefs : [];
  return current.length === next.length && next.every((ref, index) => current[index] === ref._ref);
};

const normalizeDocs = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((doc) => doc && typeof doc._id === 'string' && doc._id);
};

export const patchesForDocuments = (docs, orderedIds) =>
  docs
    .map((doc) => ({ doc, related: relatedForDocument(doc._id, orderedIds) }))
    .filter(({ doc, related }) => !sameRelated(doc.relatedRefs, related))
    .map(({ doc, related }) => ({ id: doc._id, related }));

export const commitRelatedPatches = async (client, patches) => {
  if (!patches.length) return;
  let tx = client.transaction();
  for (const patch of patches) {
    tx = tx.patch(patch.id, (builder) => builder.set({ relatedArticles: patch.related }));
  }
  await tx.commit();
};

const resolveCategoryKeys = async (client, target, targetDocs) => {
  const currentKeys = targetDocs.map(categoryKeyFromDoc);

  let referencingKeys = [];
  if (!target.hasPreviousCategory) {
    const found = await Promise.all(
      target.ids.map((id) => {
        const current = categoryKeyFromDoc(targetDocs.find((doc) => doc._id === id));
        const params = current ? { id, categoryKey: current.categoryKey } : { id };
        return client.fetch(referencingQuery(current?.keyType), params);
      })
    );
    referencingKeys = found.flatMap(normalizeDocs).map(categoryKeyFromDoc);
  }

  // 上限で切るので、現在 → previous → 参照元の順に優先する。
  // payload のカテゴリは、ドキュメントを引けなかったとき（削除など）だけ使う。
  const keys = uniqueKeys([
    ...currentKeys,
    ...target.previousKeys,
    ...(targetDocs.length === 0 ? target.keys : []),
    ...referencingKeys,
  ]);
  if (keys.length > MAX_CATEGORY_KEYS) {
    console.warn('[update-related] categories truncated', { found: keys.length });
  }
  return keys.slice(0, MAX_CATEGORY_KEYS);
};

const planCategory = async (client, key, targetDocs) => {
  const { keyType, categoryKey } = key;
  const top = normalizeDocs(await client.fetch(categoryWindowQuery(keyType), { categoryKey }));
  const orderedIds = top.map((doc) => doc._id);

  const outside = targetDocs
    .filter((doc) => !orderedIds.includes(doc._id))
    .filter((doc) => {
      const own = categoryKeyFromDoc(doc);
      return own && keyId(own) === keyId(key);
    })
    .map((doc) => doc._id);
  const members = outside.length
    ? normalizeDocs(await client.fetch(categoryMemberQuery(keyType), { categoryKey, ids: outside }))
    : [];

  const docs = [...top, ...members];
  return { examined: docs.length, patches: patchesForDocuments(docs, orderedIds) };
};

export const updateRelated = async (client, target) => {
  const targetDocs = target.ids.length
    ? normalizeDocs(await client.fetch(TARGET_DOCS_QUERY, { ids: target.ids }))
    : [];
  const keys = await resolveCategoryKeys(client, target, targetDocs);
  const plans = await Promise.all(keys.map((key) => planCategory(client, key, targetDocs)));
  const patches = plans.flatMap((plan) => plan.patches);
  await commitRelatedPatches(client, patches);

  return {
    categories: keys.length,
    examined: plans.reduce((total, plan) => total + plan.examined, 0),
    updated: patches.length,
  };
};

const json = (body, status = 200) => Response.json(body, { status });

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

  const target = extractUpdateTargets(payload, event.request.headers);
  if (target.skip) return json({ ok: true, message: target.message });
  if (target.keys.length === 0 && target.ids.length === 0) {
    console.log('[update-related] skipped: no document id');
    return json({ ok: true, skipped: true, reason: 'no-document' });
  }

  try {
    const result = await updateRelated(createWriteClient(deps, env), target);
    console.log('[update-related] completed', result);
    return json({ ok: true, ...result });
  } catch (error) {
    console.error('[update-related] failed', error);
    return json({ ok: false, message: error?.message || 'Update failed' }, 500);
  }
};
