import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { notifyIndexNow } from '$lib/server/indexnow.js';
import { SITE } from '$lib/config/site.js';
import { resolveIndexNowBase, resolveSiteOrigin } from '$lib/server/site-origin.js';
import {
  PAGE_TAG,
  buildPurgeUrls,
  isCloudflarePlatform,
  purgeCloudflareUrls,
  quizCacheTag
} from '$lib/server/edge-cache.js';

const WEBHOOK_SECRET = env.SANITY_REVALIDATE_SECRET || env.VERCEL_REVALIDATE_TOKEN || '';
const REVALIDATE_TOKEN = env.VERCEL_REVALIDATE_TOKEN || env.SANITY_REVALIDATE_SECRET || '';

const SLUG_QUERY = /* groq */ `*[_id in $ids]{ _id, _type, "slug": slug.current }`;
const CATEGORY_FROM_SLUG_QUERY = /* groq */ `
  *[_type == "quiz" && slug.current in $slugs]{ "slug": slug.current, "category": category->slug.current }
`;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const toStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => toStringArray(item));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === 'object') {
    const current = value?.current || value?._current || value?.slug;
    return current ? toStringArray(current) : [];
  }
  return [];
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const collectDocumentIds = (payload) => {
  if (!payload || typeof payload !== 'object') return [];
  const ids = new Set();
  const add = (value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) ids.add(trimmed);
    }
  };

  if (payload.documentId) add(payload.documentId);
  if (payload._id) add(payload._id);
  if (Array.isArray(payload.ids)) {
    payload.ids.forEach((entry) => {
      if (typeof entry === 'string') {
        add(entry);
      } else if (entry && typeof entry === 'object') {
        Object.values(entry).forEach(add);
      }
    });
  }
  if (payload.ids?.created) payload.ids.created.forEach(add);
  if (payload.ids?.updated) payload.ids.updated.forEach(add);
  if (payload.ids?.deleted) payload.ids.deleted.forEach(add);
  if (payload.document?._id) add(payload.document._id);
  if (payload.current?._id) add(payload.current._id);
  if (payload.previous?._id) add(payload.previous._id);
  if (payload.after?._id) add(payload.after._id);
  if (payload.payload?._id) add(payload.payload._id);

  return Array.from(ids);
};

const resolveDocumentSlugs = async (payload) => {
  const slugMap = new Map();

  const addSlug = (slug, type) => {
    const normalized = typeof slug === 'string' ? slug.trim() : '';
    if (!normalized) return;
    const existing = slugMap.get(normalized);
    if (existing) {
      if (type) existing.types.add(type);
      return;
    }
    const types = new Set();
    if (type) types.add(type);
    slugMap.set(normalized, { slug: normalized, types });
  };

  const addFromValue = (value, typeHint) => {
    for (const candidate of toStringArray(value)) {
      addSlug(candidate, typeHint);
    }
  };

  const inspectDocumentLike = (value) => {
    if (!value || typeof value !== 'object') return;
    const typeHint = typeof value._type === 'string' ? value._type.trim() : undefined;
    if (value.slug !== undefined) {
      addFromValue(value.slug, typeHint);
    } else {
      addFromValue(value, typeHint);
    }
  };

  addFromValue(payload?.slug);
  addFromValue(payload?.slugs);
  inspectDocumentLike(payload?.document);
  inspectDocumentLike(payload?.current);
  inspectDocumentLike(payload?.previous);
  inspectDocumentLike(payload?.after);
  inspectDocumentLike(payload?.payload);

  const ids = collectDocumentIds(payload);
  if (ids.length > 0 && !shouldSkipSanityFetch()) {
    try {
      const result = await client.fetch(SLUG_QUERY, { ids });
      if (Array.isArray(result)) {
        for (const entry of result) {
          const type = typeof entry?._type === 'string' ? entry._type.trim() : undefined;
          addFromValue(entry?.slug, type);
        }
      }
    } catch (error) {
      console.error('[revalidate] Failed to resolve slugs from Sanity', error);
    }
  }

  return Array.from(slugMap.values()).map((entry) => ({
    slug: entry.slug,
    types: Array.from(entry.types)
  }));
};

// 戻り値: { categories: カテゴリスラッグ[], articlePaths: '/category/<cat>/<slug>'[] }
const resolveCategorySlugs = async (slugs) => {
  if (!Array.isArray(slugs) || slugs.length === 0 || shouldSkipSanityFetch()) {
    return { categories: [], articlePaths: [] };
  }

  const categories = new Set();
  const articlePaths = new Set();

  try {
    const result = await client.fetch(CATEGORY_FROM_SLUG_QUERY, { slugs });
    if (Array.isArray(result)) {
      for (const entry of result) {
        const slug = typeof entry?.category === 'string' ? entry.category.trim() : '';
        if (slug) categories.add(slug);
        const quizSlug = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
        if (slug && quizSlug) articlePaths.add(`/category/${slug}/${quizSlug}`);
      }
    }
  } catch (error) {
    console.error('[revalidate] Failed to resolve category slugs', error);
  }

  return { categories: Array.from(categories), articlePaths: Array.from(articlePaths) };
};

// Cloudflare Workers 実行時: Cache API（このデータセンター）とゾーンの URL 指定パージ。
// CF_ZONE_ID / CF_PURGE_API_TOKEN（Zone > Cache Purge 権限のみのトークン）が未設定なら
// ローカル削除だけ行い、他データセンターは CF_ARTICLE_CACHE_TTL 経過で自然に更新される。
// タグ: 記事ごとの quiz-<slug>（UTM 付き URL のキャッシュも消える）と、一覧・フィード用の PAGE_TAG。
const purgeOnCloudflare = async ({ event, paths, quizSlugs = [] }) => {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  const origins = [event.url.origin, resolveSiteOrigin(publicEnv.PUBLIC_SITE_URL, SITE.url)];
  const urls = buildPurgeUrls(uniquePaths, origins);
  const outcome = await purgeCloudflareUrls({
    platform: event.platform,
    urls,
    tags: [...quizSlugs.map(quizCacheTag), PAGE_TAG],
    zoneId: env.CF_ZONE_ID,
    apiToken: env.CF_PURGE_API_TOKEN
  });

  if (outcome.zone === 'skipped') {
    console.warn(
      '[revalidate] CF_ZONE_ID / CF_PURGE_API_TOKEN not configured. Purged local data center only.'
    );
  }
  if (outcome.errors.length > 0) {
    console.error('[revalidate] Cloudflare purge errors', outcome.errors);
  }

  const failed = outcome.zone === 'failed';
  return uniquePaths.map((path) => ({
    path,
    method: outcome.zone === 'ok' ? 'cloudflare-zone-purge' : 'cloudflare-local-purge',
    attempts: 1,
    ...(failed ? { error: 'Cloudflare zone purge failed' } : {})
  }));
};

const revalidatePaths = async ({ event, paths, quizSlugs }) => {
  if (isCloudflarePlatform(event.platform)) {
    return purgeOnCloudflare({ event, paths, quizSlugs });
  }

  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  const results = [];

  const baseUrl = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : event.url.origin;
  const contextRes = event.platform?.context?.res;
  const hasContextRevalidate = typeof contextRes?.revalidate === 'function';

  for (const path of uniquePaths) {
    let attempt = 0;
    let lastError = null;
    let useContext = hasContextRevalidate;

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        if (useContext) {
          await contextRes.revalidate(path);
          results.push({ path, method: 'context', attempts: attempt });
          lastError = null;
          break;
        }

        if (!REVALIDATE_TOKEN) {
          throw new Error('Missing REVALIDATE_TOKEN');
        }

        const targetUrl = new URL(path, baseUrl);
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: { 'x-prerender-revalidate': REVALIDATE_TOKEN }
        });

        if (!response.ok) {
          throw new Error(`Revalidate fetch failed with status ${response.status}`);
        }

        results.push({ path, method: 'fetch', attempts: attempt });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (useContext) {
          useContext = false;
        } else if (attempt < MAX_RETRIES) {
          await wait(RETRY_DELAY_MS * attempt);
        }
      }
    }

    if (lastError) {
      console.error(`[revalidate] Failed for path: ${path}`, lastError);
      results.push({ path, error: lastError?.message || String(lastError), attempts: attempt });
    }
  }

  return results;
};

export const POST = async (event) => {
  if (!WEBHOOK_SECRET) {
    console.error('[revalidate] SANITY_REVALIDATE_SECRET is not configured.');
    return json({ ok: false, message: 'Server misconfiguration' }, { status: 500 });
  }

  const providedSecret =
    event.url.searchParams.get('secret') || event.request.headers.get('x-vercel-revalidate-key');

  if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
    return json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await event.request.json();
  } catch (error) {
    console.error('[revalidate] Invalid JSON payload', error);
    return json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const documents = await resolveDocumentSlugs(payload || {});
  const quizSlugs = documents
    .filter((doc) => doc.types.length === 0 || doc.types.includes('quiz'))
    .map((doc) => doc.slug);
  const directCategorySlugs = documents
    .filter((doc) => doc.types.includes('category'))
    .map((doc) => doc.slug);
  const { categories: relatedCategorySlugs, articlePaths } = await resolveCategorySlugs(quizSlugs);
  const categorySlugs = Array.from(new Set([...directCategorySlugs, ...relatedCategorySlugs]));
  const paths = new Set(['/', '/quiz', '/sitemap.xml']);

  for (const slug of quizSlugs) {
    const normalized = typeof slug === 'string' ? slug.trim() : '';
    if (!normalized) continue;
    paths.add(`/quiz/${normalized}`);
    paths.add(`/quiz/${normalized}/answer`);
  }

  for (const categorySlug of categorySlugs) {
    const normalized = typeof categorySlug === 'string' ? categorySlug.trim() : '';
    if (!normalized) continue;
    paths.add(`/category/${normalized}`);
  }

  const logLabel = payload?.transition || payload?.operation || 'unknown';
  console.log('[revalidate] Triggered', {
    transition: logLabel,
    paths: Array.from(paths),
    categories: categorySlugs
  });

  // canonical の記事 URL（/category/<cat>/<slug>）は Cloudflare のキャッシュキーなのでパージ対象に含める。
  // Vercel 経路は本番稼働中のため従来の対象パスのまま変えない。
  if (isCloudflarePlatform(event.platform)) {
    for (const articlePath of articlePaths) paths.add(articlePath);
  }

  const results = await revalidatePaths({ event, paths: Array.from(paths), quizSlugs });

  // 記事公開・更新時のみ IndexNow へ通知（削除・スケジュール解除は除外）
  const isPublishEvent = ['publish', 'update', 'create'].includes(
    (payload?.transition || payload?.operation || '').toLowerCase()
  );
  let indexNowResult = null;
  if (isPublishEvent && quizSlugs.length > 0) {
    // 本番ドメインを基点にする（*.vercel.app / *.workers.dev の URL は IndexNow の host と一致せず拒否されるため）
    const baseUrl = resolveIndexNowBase(publicEnv.PUBLIC_SITE_URL, SITE.url);
    const indexNowUrls = quizSlugs.flatMap((slug) => [
      `${baseUrl}/quiz/${slug}`,
      `${baseUrl}/quiz/${slug}/answer`
    ]);
    indexNowResult = await notifyIndexNow(indexNowUrls);
  }

  const failed = results.filter((result) => result.error);
  const status = failed.length > 0 ? 500 : 200;

  return json(
    {
      ok: failed.length === 0,
      revalidated: results,
      slugs: quizSlugs,
      categories: categorySlugs,
      indexNow: indexNowResult
    },
    { status }
  );
};

export const GET = () => json({ ok: false, message: 'Method Not Allowed' }, { status: 405 });
