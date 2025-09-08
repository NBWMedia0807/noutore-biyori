// /src/routes/quiz/[slug]/+page.server.js
import { error, isHttpError } from '@sveltejs/kit';
import { client } from '$lib/sanity.js';

export const prerender = false;

// slug.current か _id のどちらでも取れるように両対応
const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug OR _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  body,
  mainImage{ asset->{ url, metadata } }
}
`;

export const load = async ({ params }) => {
  // ---- 計測ログ: ここから ----
  console.log('[quiz/[slug]] incoming slug', params?.slug);
  // Sanity クライアントの最低限の見える化（機密は出さない）
  try {
    // @ts-ignore - 内部プロパティを覗くのではなく、$lib/sanity.js を再評価
    console.log('[quiz/[slug]] sanity cfg', {
      // これらは $lib/sanity.js 内の process.env を読んで構成される想定
      // 値そのものは出さない（存在フラグのみ）
      hasProjectId: !!process.env.SANITY_PROJECT_ID,
      hasDataset: !!process.env.SANITY_DATASET,
      hasApiVersion: !!process.env.SANITY_API_VERSION,
      hasToken: !!(process.env.SANITY_READ_TOKEN || process.env.SANITY_API_TOKEN)
    });
  } catch (e) {
    console.log('[quiz/[slug]] sanity cfg print failed', e);
  }
  // ---- 計測ログ: ここまで ----

  try {
    const quiz = await client.fetch(QUERY, { slug: params.slug });
    console.log('[quiz/[slug]] fetched?', !!quiz);

    if (!quiz) {
      console.log('[quiz/[slug]] not found => 404', params.slug);
      throw error(404, 'Not found');
    }

    return { quiz };
  } catch (e) {
    if (isHttpError(e)) {
      console.log('[quiz/[slug]] rethrow http error', e.status);
      throw e;
    }
    console.error('[quiz/[slug]] fetch failed => 500', { msg: e?.message });
    throw error(500, 'Failed to load quiz');
  }
};
