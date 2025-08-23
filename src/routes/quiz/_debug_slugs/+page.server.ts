import { client } from '$lib/sanity.js';
export const prerender = false;

const Q = `*[defined(slug.current)]|order(_updatedAt desc)[0..100]{
  _id,_type,title,"slug": slug.current
}`;

export const load = async () => {
  const rows = await client.fetch(Q);
  return { rows };
};