import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { revalidateQuizTags } from '$lib/server/revalidate-tags.js';

const CRON_SECRET = env.VERCEL_CRON_SECRET || env.CRON_SECRET || '';
const DEFAULT_WINDOW_MINUTES = 120;

const SCHEDULED_QUERY = /* groq */ `*[
  _type == "quiz" &&
  defined(slug.current) &&
  defined(publishedAt) &&
  publishedAt >= $since &&
  publishedAt <= now()
]{
  _id,
  "slug": slug.current,
  publishedAt,
  "category": category->slug.current
}`;

const toWindowMs = (value) => {
  if (!value) return DEFAULT_WINDOW_MINUTES * 60 * 1000;
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_WINDOW_MINUTES * 60 * 1000;
  }
  return minutes * 60 * 1000;
};

const resolveSinceTimestamp = (url) => {
  const sinceParam = url.searchParams.get('since');
  if (sinceParam) {
    const parsed = Date.parse(sinceParam);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    console.warn('[cron/revalidate] Invalid since parameter detected', sinceParam);
  }
  const windowMs = toWindowMs(url.searchParams.get('window'));
  return Date.now() - windowMs;
};

const collectRevalidateTargets = (items) => {
  if (!Array.isArray(items)) return { slugs: [], categorySlugs: [] };
  const slugs = new Set();
  const categorySlugs = new Set();

  for (const item of items) {
    if (typeof item?.slug === 'string') {
      const slug = item.slug.trim();
      if (slug) slugs.add(slug);
    }
    if (typeof item?.category === 'string') {
      const category = item.category.trim();
      if (category) categorySlugs.add(category);
    }
  }

  return { slugs: Array.from(slugs), categorySlugs: Array.from(categorySlugs) };
};

export const GET = async (event) => {
  if (CRON_SECRET) {
    const providedSecret =
      event.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      event.url.searchParams.get('secret');

    if (!providedSecret || providedSecret !== CRON_SECRET) {
      return json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
  }

  if (shouldSkipSanityFetch()) {
    console.info('[cron/revalidate] SKIP_SANITY active; skipping Sanity fetch');
    return json({ ok: true, skipped: true, reason: 'SKIP_SANITY' });
  }

  const sinceTs = resolveSinceTimestamp(event.url);
  const nowTs = Date.now();
  const sinceIso = new Date(sinceTs).toISOString();
  const nowIso = new Date(nowTs).toISOString();

  let items = [];
  try {
    items = await client.fetch(SCHEDULED_QUERY, { since: sinceIso });
  } catch (error) {
    console.error('[cron/revalidate] Failed to fetch scheduled quizzes', error);
    return json({ ok: false, message: 'Sanity fetch failed' }, { status: 500 });
  }

  const { slugs, categorySlugs } = collectRevalidateTargets(items);

  if (slugs.length === 0) {
    console.log('[cron/revalidate] No scheduled publishes detected', {
      since: sinceIso,
      until: nowIso
    });
    return json({ ok: true, slugs: [], categorySlugs: [], tags: [], tagResults: [] });
  }

  console.log('[cron/revalidate] Triggering tag revalidation', {
    since: sinceIso,
    until: nowIso,
    slugs,
    categories: categorySlugs
  });

  const { tags, results } = revalidateQuizTags({ slugs, categorySlugs });

  return json({ ok: true, slugs, categorySlugs, tags, tagResults: results });
};

export const POST = () => json({ ok: false, message: 'Method Not Allowed' }, { status: 405 });
