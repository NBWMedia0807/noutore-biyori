// src/routes/quiz/[slug]/+page.server.js
import { client } from '$lib/sanity.js';

const QUERY = `
*[_type=="quiz" && slug.current==$slug][0]{
  title,
  // 画像は .svelte 側の書き方に合わせて asset->url まで展開
  mainImage{asset->},
  // 本文（任意）：リッチテキストでなければ string / HTML を想定
  body,
  // 追加で使うならここに他フィールドも列挙OK
}
`;

export async function load({ params }) {
  const quiz = await client.fetch(QUERY, { slug: params.slug });
  if (!quiz) {
    return { status: 404, error: new Error('Not found') };
  }
  return { quiz };
}
