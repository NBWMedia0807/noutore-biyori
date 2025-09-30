import { error, redirect } from '@sveltejs/kit';
import { createSlugContext, findQuizDocument } from '$lib/server/quiz.js';

export const prerender = false;
export const ssr = true;
export const config = { runtime: 'nodejs22.x' };

const Q = /* groq */ `*[_type == "quiz" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  _id,
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  "problemImage": select(
    defined(problemImage) => problemImage,
    defined(questionImage) => questionImage,
    defined(mainImage) => mainImage,
    null
  ){ asset->{ url, metadata } },
  hint,
  hints,
  body,
  problemDescription,
  closingMessage,
  answerImage{ asset->{ url, metadata } },
  answerExplanation,
  _createdAt,
  _updatedAt
}`;

export async function load({ params, setHeaders }) {
  const slugSegments = Array.isArray(params.slug) ? params.slug : [params.slug];
  const slug = slugSegments.join('/');
  const slugContext = createSlugContext(slug);
  const { doc } = await findQuizDocument({
    slugContext,
    query: Q,
    logPrefix: 'quiz/[...slug]'
  });
  if (!doc) throw error(404, `Quiz not found: ${slug}`);
  if (typeof doc.slug === 'string' && doc.slug !== slug) {
    throw redirect(308, `/quiz/${doc.slug}`);
  }
  setHeaders({ 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  return {
    doc,
    ui: {
      showHeader: true,
      hideGlobalNavTabs: true,
      hideBreadcrumbs: true
    },
    seo: {
      canonical: `/quiz/${doc.slug}`
    }
  };
}
