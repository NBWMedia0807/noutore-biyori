// src/routes/quiz/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createClient } from '@sanity/client';

// Sanityクライアント（まずは直書きで復旧）
const client = createClient({
  projectId: 'quljge22',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,    // 公開データのみを高速取得
  perspective: 'published',
});

// slugで記事1件を取得
const QUERY = `*[defined(slug.current) && slug.current==$slug][0]{
  _id, _type, title, slug, body, mainImage{asset->{url, metadata}}
}`;

export const load: PageServerLoad = async ({ params }) => {
  const quiz = await client.fetch(QUERY, { slug: params.slug });
  if (!quiz) throw error(404, 'Not found');
  return { quiz };
};