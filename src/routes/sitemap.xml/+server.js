import { client } from '$lib/sanity.server.js';
import { SITE } from '$lib/config/site.js';
import {
  CATEGORY_DRAFT_FILTER,
  QUIZ_EFFECTIVE_PUBLISHED_FIELD,
  QUIZ_ORDER_BY_PUBLISHED,
  QUIZ_PUBLISHED_FILTER,
  resolvePublishedDate
} from '$lib/queries/quizVisibility.js';
import { QUIZ_SITEMAP_TAG } from '$lib/cache/tags.js';

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.4' }
];

const QUERY = /* groq */ `{
  "categories": *[_type == "category" && defined(slug.current)${CATEGORY_DRAFT_FILTER}] | order(_updatedAt desc) {
    "slug": slug.current,
    _updatedAt
  },
  "quizzes": *[
    _type == "quiz"
    && defined(slug.current)
    ${QUIZ_PUBLISHED_FILTER}
  ] | order(${QUIZ_ORDER_BY_PUBLISHED}) {
    _id,
    "slug": slug.current,
    _updatedAt,
    _createdAt,
    publishedAt,
    "effectivePublishedAt": ${QUIZ_EFFECTIVE_PUBLISHED_FIELD}
  }
}`;

const toAbsoluteUrl = (path) => new URL(path, SITE.url).href;
const toIsoString = (value) => {
  if (!value) return undefined;
  try {
    return new Date(value).toISOString();
  } catch (error) {
    console.error('[sitemap] Invalid date', value, error);
    return undefined;
  }
};

const createUrlElement = ({ loc, lastmod, changefreq, priority }) => {
  const parts = [`    <loc>${loc}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `<url>\n${parts.join('\n')}\n  </url>`;
};

export const GET = async ({ depends }) => {
  depends(QUIZ_SITEMAP_TAG);

  let categories = [];
  let quizzes = [];

  try {
    const result = await client.fetch(QUERY);
    categories = Array.isArray(result?.categories) ? result.categories.filter(Boolean) : [];
    quizzes = Array.isArray(result?.quizzes) ? result.quizzes.filter(Boolean) : [];
  } catch (error) {
    console.error('[sitemap] Failed to fetch Sanity data:', error);
  }

  const urlEntries = new Map();

  const addEntry = (path, options = {}) => {
    if (!path) return;
    const loc = toAbsoluteUrl(path);
    const existing = urlEntries.get(loc) ?? {};
    urlEntries.set(loc, {
      loc,
      changefreq: options.changefreq ?? existing.changefreq,
      priority: options.priority ?? existing.priority,
      lastmod: options.lastmod ?? existing.lastmod
    });
  };

  STATIC_ROUTES.forEach((route) => addEntry(route.path, route));

  categories.forEach((category) => {
    if (!category?.slug) return;
    addEntry(`/category/${category.slug}`, {
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: toIsoString(category._updatedAt)
    });
  });

  quizzes.forEach((quiz) => {
    const slug = quiz?.slug;
    if (!slug) return;
    const published =
      quiz?.effectivePublishedAt ?? resolvePublishedDate(quiz, quiz?._id ?? slug);
    const lastmod = published ?? toIsoString(quiz._updatedAt ?? quiz._createdAt);
    addEntry(`/quiz/${slug}`, {
      changefreq: 'weekly',
      priority: '0.8',
      lastmod
    });
    addEntry(`/quiz/${slug}/answer`, {
      changefreq: 'weekly',
      priority: '0.6',
      lastmod
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    Array.from(urlEntries.values())
      .sort((a, b) => a.loc.localeCompare(b.loc))
      .map((entry) => createUrlElement(entry))
      .join('\n')
  }\n</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
