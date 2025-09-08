// /src/routes/quiz/[slug]/+page.server.js
import { error, isHttpError } from '@sveltejs/kit';
import { client } from '$lib/sanity.js';

export const prerender = false;

// slug.current か _id のどちらでも取れるように両対応
const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  body,
  mainImage{
    asset->{ url, metadata }
  }
}
`;

export const load = async ({ params }) => {
  try {
    // ── 一時デバッグログ（どの slug が来たか）
    console.log('[quiz] incoming slug', params.slug);

    const quiz = await client.fetch(QUERY, { slug: params.slug });

    // ── 取れた/取れないの判定をログ出し
    console.log('[quiz] fetched?', Boolean(quiz));

    if (!quiz) throw error(404, 'Not found');
    return { quiz };
  } catch (e) {
    // 既に HttpError（404/500…）ならそのまま再スロー
    if (isHttpError(e)) {
      throw e;
    }
    // 想定外の例外だけ 500 にする（スタックは漏らさない）
    console.error('[quiz/[slug]+page.server] fetch failed', e?.message ?? e);
    throw error(500, 'Failed to load quiz');
  }
};
