// Sanityから1件取得して quiz を返す（サーバ専用クライアントを使用）
export const prerender = false;
import { json } from '@sveltejs/kit';
import { client } from '$lib/sanity.server.js';

const QUERY = /* groq */ `
*[_type == "quiz" && (slug.current == $slug || _id == $slug)][0]{
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  category->{ title, "slug": slug.current },
  // Studio 側の日本語フィールド(問題画像)にも対応
  "mainImage": {
    "asset": {
      "url": coalesce(mainImage.asset->url, ["問題画像"].asset->url)
    }
  },
  problemDescription,
  hints,
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
  // SSR用のプレーンテキスト化（PT配列→文字列）
  const ptToText = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) {
      return v
        .filter((b) => b && b._type === 'block')
        .map((b) => (b.children || [])
          .filter((c) => c && c._type === 'span')
          .map((c) => c.text)
          .join(''))
        .join('\n');
    }
    return '';
  };
  const problemText = doc ? ptToText(doc.problemDescription) : '';
  const hintsText = doc && Array.isArray(doc.hints) ? doc.hints.map(ptToText).filter(Boolean) : [];
  return { quiz: doc, __dataSource, problemText, hintsText };
};
