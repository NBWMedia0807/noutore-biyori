/**
 * /author/[slug] — 著者プロフィールページ
 *
 * E-E-A-T 対応: 著者情報を構造化データ（Person スキーマ）として出力する。
 * 2026年アップデートで健康・認知症関連コンテンツはYMYL扱いとなり
 * 著者資格・経歴の明示が実質必須となった。
 */

import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';
import { createPageSeo } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';

const Q = /* groq */ `*[_type == "author" && slug.current == $slug][0]{
  _id,
  name,
  "slug": slug.current,
  "photoUrl": photo.asset->url,
  jobTitle,
  bio,
  career,
  sameAs
}`;

/** Person JSON-LD スキーマを生成する */
const buildPersonSchema = ({ author, url }) => ({
  '@type': 'Person',
  '@id': `${url}#person`,
  name: author.name,
  url,
  ...(author.photoUrl && {
    image: {
      '@type': 'ImageObject',
      url: author.photoUrl
    }
  }),
  ...(author.jobTitle && { jobTitle: author.jobTitle }),
  ...(Array.isArray(author.sameAs) && author.sameAs.length > 0 && {
    sameAs: author.sameAs.filter((u) => typeof u === 'string' && u.startsWith('http'))
  })
});

export async function load({ params, setHeaders }) {
  const { slug } = params;

  let author;
  try {
    author = await client.fetch(Q, { slug });
  } catch (err) {
    console.error('[author] Sanity fetch error:', err);
    throw error(503, 'データ取得に失敗しました。しばらくしてから再度お試しください。');
  }

  if (!author) throw error(404, `Author not found: ${slug}`);

  setHeaders({ 'Cache-Control': 'public, max-age=3600, s-maxage=86400' });

  const path = `/author/${slug}`;
  const canonicalUrl = `${SITE.url}${path}`;
  const personSchema = buildPersonSchema({ author, url: canonicalUrl });

  const seo = createPageSeo({
    title: author.name,
    description: author.bio
      ? author.bio.slice(0, 160)
      : `${author.name}のプロフィールページです。${SITE.name}の著者情報をご確認いただけます。`,
    path,
    breadcrumbs: [{ name: '著者情報', url: path }],
    additionalJsonLd: [personSchema]
  });

  return { author, seo };
}
