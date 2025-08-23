import { json } from '@sveltejs/kit';
import { createClient } from '@sanity/client';

export const prerender = false;

const mk = (projectId: string) =>
  createClient({ projectId, dataset: 'production', apiVersion: '2024-01-01', useCdn: true, perspective: 'published' });

const clients = [
  { label: 'quljge22', client: mk('quljge22') },
  { label: 'dxl04rd4', client: mk('dxl04rd4') }, // 画像で使われていたID
];

const Q = `*[defined(slug.current) && slug.current==$slug][0]{_id,_type,title,slug,_updatedAt}`;

export async function GET({ params }) {
  const out: Record<string, any> = {};
  for (const { label, client } of clients) {
    out[label] = await client.fetch(Q, { slug: params.slug });
  }
  return json(out);
}