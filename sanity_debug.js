import { createClient } from '@sanity/client';

// Sanityクライアントの設定
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  useCdn: true,
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_READ_TOKEN
});

async function debugSanityData() {
  console.log('=== Sanity データ調査開始 ===\n');

  try {
    // 1. 全てのドキュメントタイプを確認
    console.log('1. 全ドキュメントタイプ:');
    const allTypes = await client.fetch(`*[]{_type} | order(_type asc)`);
    const uniqueTypes = [...new Set(allTypes.map(doc => doc._type))];
    console.log(uniqueTypes);
    console.log('');

    // 2. クイズドキュメントを確認
    console.log('2. クイズドキュメント:');
    const quizzes = await client.fetch(`*[_type == "quiz"]{
      _id,
      _type,
      _createdAt,
      title,
      "slug": slug.current,
      category->{ title, "slug": slug.current },
      mainImage,
      problemDescription,
      "hints": coalesce(hints, hint),
      "legacyHint": hint,
      adCode1,
      answerImage,
      answerExplanation,
      adCode2,
      closingMessage
    }`);
    console.log(`クイズ数: ${quizzes.length}`);
    console.log(JSON.stringify(quizzes, null, 2));
    console.log('');

    // 3. カテゴリドキュメントを確認
    console.log('3. カテゴリドキュメント:');
    const categories = await client.fetch(`*[_type == "category"]{
      _id,
      _type,
      title,
      slug
    }`);
    console.log(`カテゴリ数: ${categories.length}`);
    console.log(JSON.stringify(categories, null, 2));
    console.log('');

    // 4. 全ドキュメントを確認（少数）
    console.log('4. 全ドキュメント（最新5件）:');
    const allDocs = await client.fetch(`*[]{
      _id,
      _type,
      _createdAt,
      title
    } | order(_createdAt desc)[0...5]`);
    console.log(JSON.stringify(allDocs, null, 2));
    console.log('');

    // 5. 特定のslugでクイズを検索
    console.log('5. sample-quiz検索:');
    const sampleQuiz = await client.fetch(`*[_type == "quiz" && slug.current == "sample-quiz"][0]{
      _id,
      title,
      "slug": slug.current,
      category->{ title, "slug": slug.current },
      mainImage,
      problemDescription,
      "hints": coalesce(hints, hint),
      "legacyHint": hint,
      adCode1,
      answerImage,
      answerExplanation,
      adCode2,
      closingMessage
    }`);
    console.log(JSON.stringify(sampleQuiz, null, 2));

  } catch (error) {
    console.error('エラー:', error);
  }
}

debugSanityData();
