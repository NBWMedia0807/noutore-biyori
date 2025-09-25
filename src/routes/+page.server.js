// src/routes/+page.server.js
import { client } from '$lib/sanity.server.js';

const QUIZZES_QUERY = /* groq */ `
*[_type == "quiz"] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  category->{ _id, title, "slug": slug.current },
  mainImage,
  // SSR用のサムネイルURL（asset参照がない場合の保険）
  "thumbnailUrl": mainImage.asset->url,
  problemDescription
}`;

export const load = async () => {
  try {
    const result = await client.fetch(QUIZZES_QUERY);
    const quizzes = Array.isArray(result) ? result.filter(Boolean) : [];

    return { quizzes };
  } catch (error) {
    console.error('[+page.server.js] Error fetching quizzes:', error);
    return { quizzes: [] };
  }
};
