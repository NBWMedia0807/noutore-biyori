// Sanityから1件取得して quiz で返す（サーバ専用クライアントを使用）
import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';

const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  title,
  "slug": slug.current,
  // Studio 側の日本語フィールド(問題画像)にも対応
  "mainImage": {
    "asset": {
      "url": coalesce(mainImage.asset->url, ["問題画像"].asset->url)
    }
  },
  problemDescription,
  hint
}
`;

export const load = async ({ params }) => {
  const slug = params.slug;
  const doc = await client.fetch(QUERY, { slug });
  if (!doc) throw error(404, 'Not found');
  return { quiz: doc };
};
