import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// Sanityクライアントの設定
export const client = createClient({
  projectId: 'dxl04rd4',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-08-17'
});

// 画像URL生成用のビルダー
const builder = imageUrlBuilder(client);

export function urlFor(source) {
  return builder.image(source);
}

// クイズ一覧を取得
export async function getQuizzes() {
  const query = `*[_type == "quiz"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    mainImage,
    difficulty,
    publishedAt,
    category->{
      title,
      description
    }
  }`;
  
  return await client.fetch(query);
}

// 特定のクイズを取得
export async function getQuiz(slug) {
  const query = `*[_type == "quiz" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    mainImage,
    problemDescription,
    hint,
    answerImage,
    answerExplanation,
    closingMessage,
    difficulty,
    publishedAt,
    category->{
      title,
      description
    }
  }`;
  
  return await client.fetch(query, { slug });
}

// カテゴリ一覧を取得
export async function getCategories() {
  const query = `*[_type == "category"] | order(title asc) {
    _id,
    title,
    description
  }`;
  
  return await client.fetch(query);
}

