/**
 * /category/[categorySlug]/[quizSlug] — カテゴリ別クイズページ（新 canonical URL）
 *
 * 2026年2月 Discover コアアップデート対応:
 * URL 階層にカテゴリを含めることでトピック権威をシグナルする。
 * 旧 URL /quiz/[slug] はここへ 308 リダイレクト済み。
 */

import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';
import { createPageSeo, portableTextToPlain, resolveQuizOgImage } from '$lib/seo.js';
import { SITE } from '$lib/config/site.js';
import { fetchRelatedQuizzes } from '$lib/server/related-quizzes.js';
import { QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';
import { ensurePublishedAt, resolvePublishedDate } from '$lib/utils/publishedDate.js';

export const prerender = false;
export const ssr = true;

const quizBypassToken = env.VERCEL_REVALIDATE_TOKEN || env.SANITY_REVALIDATE_SECRET;
const quizIsrConfig = { expiration: false };
if (quizBypassToken) {
  quizIsrConfig.bypassToken = quizBypassToken;
}
export const config = { runtime: 'nodejs22.x', isr: quizIsrConfig };

const Q = /* groq */ `*[
  _type == "quiz"
  && slug.current == $slug
  ${QUIZ_PUBLISHED_FILTER}
][0]{
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title, "slug": slug.current },
  "problemImage": select(
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    defined(mainImage) => mainImage,
    null
  ){ asset->{ url, metadata } },
  "mainImage": select(
    defined(mainImage) => mainImage,
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    null
  ){ asset->{ url, metadata } },
  hint,
  hints,
  body,
  problemDescription,
  closingMessage,
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  publishedAt,
  _createdAt,
  _updatedAt,
  "relatedArticles": relatedArticles[]->{
    "slug": slug.current,
    "categorySlug": category->slug.current
  }
}`;

const buildSeo = ({ doc, path }) => {
  const plainBody = portableTextToPlain(doc?.body);
  const plainProblem = portableTextToPlain(doc?.problemDescription);
  const description = (plainBody || plainProblem || '').trim() || SITE.description;
  const image = resolveQuizOgImage(doc);
  const publishedAt = resolvePublishedDate(doc, doc?._id ?? doc?.slug ?? path);
  const modifiedAt = doc?._updatedAt ?? publishedAt;

  const breadcrumbs = [];
  if (doc?.category?.title && doc?.category?.slug) {
    breadcrumbs.push({
      name: doc.category.title,
      url: `/category/${doc.category.slug}`
    });
  }
  breadcrumbs.push({ name: doc?.title ?? 'クイズ', url: path });

  // JSON-LD relatedLink: 関連記事のカテゴリ別 canonical URL を生成
  const relatedLinks = Array.isArray(doc?.relatedArticles)
    ? doc.relatedArticles
        .filter((r) => r?.slug && r?.categorySlug)
        .map((r) => `/category/${r.categorySlug}/${r.slug}`)
    : [];

  return createPageSeo({
    title: doc?.title ?? '脳トレ問題',
    description,
    path,
    type: 'article',
    image,
    breadcrumbs,
    article: {
      title: doc?.title ?? SITE.name,
      datePublished: publishedAt,
      dateModified: modifiedAt,
      authorName: SITE.authorName,
      category: doc?.category?.title,
      relatedLinks
    }
  });
};

export async function load({ params, setHeaders }) {
  const { categorySlug, quizSlug } = params;

  let doc;
  try {
    doc = await client.fetch(Q, { slug: quizSlug });
  } catch (err) {
    console.error('[category/quiz] Sanity fetch error:', err);
    throw error(503, 'データ取得に失敗しました。しばらくしてから再度お試しください。');
  }

  if (!doc) throw error(404, `Quiz not found: ${quizSlug}`);

  const normalizedDoc = ensurePublishedAt(doc, doc?._id ?? quizSlug);

  // カテゴリスラッグが一致しない場合は正しいカテゴリ URL へリダイレクト
  const correctCategorySlug = normalizedDoc.category?.slug;
  if (correctCategorySlug && correctCategorySlug !== categorySlug) {
    throw redirect(308, `/category/${correctCategorySlug}/${normalizedDoc.slug}`);
  }

  // カテゴリ情報がない場合はフォールバック（旧 URL へ）
  if (!correctCategorySlug) {
    throw redirect(308, `/quiz/${normalizedDoc.slug}`);
  }

  setHeaders({ 'Cache-Control': 'public, max-age=60, s-maxage=300' });

  const path = `/category/${categorySlug}/${normalizedDoc.slug}`;
  const breadcrumbs = [];
  if (normalizedDoc?.category?.title && normalizedDoc?.category?.slug) {
    breadcrumbs.push({
      name: normalizedDoc.category.title,
      url: `/category/${normalizedDoc.category.slug}`
    });
  }
  breadcrumbs.push({ name: normalizedDoc?.title ?? 'クイズ', url: path });

  const related = await fetchRelatedQuizzes({
    slug: normalizedDoc.slug,
    categorySlug: normalizedDoc.category?.slug ?? null
  });

  const nextQuiz = related?.[0] ?? null;

  return {
    doc: normalizedDoc,
    related,
    nextQuiz,
    breadcrumbs,
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: true,
      mainClass: 'main--flush'
    },
    seo: buildSeo({ doc: normalizedDoc, path })
  };
}
