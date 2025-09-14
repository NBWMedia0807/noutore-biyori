// Sanityから1件取得して quiz を返す（サーバ専用クライアントを使用）
export const prerender = false;
import { json } from '@sveltejs/kit';
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

export const load = async (event) => {
  const { params, setHeaders } = event;
  // キャッシュさせない（Sanity更新の即時反映を優先）
  setHeaders({ 'cache-control': 'no-store, no-cache, must-revalidate' });

  const slug = params.slug;
  let doc = null;
  try {
    doc = await client.fetch(QUERY, { slug });
  } catch (e) {
    doc = null;
  }
  // 失敗時は空表示（スタブにしない）
  const __dataSource = doc ? 'sanity' : 'stub';
  return { quiz: doc, __dataSource };
};
