import { createClient } from '@sanity/client';
import fs from 'fs';

// Sanityクライアントの設定
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_AUTH_TOKEN || process.env.SANITY_WRITE_TOKEN
});

// 画像をアップロードする関数
async function uploadImage(imagePath, filename) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const asset = await client.assets.upload('image', imageBuffer, {
      filename: filename
    });
    console.log(`✅ 画像アップロード完了: ${filename}`);
    return asset;
  } catch (error) {
    console.error(`❌ 画像アップロード失敗: ${filename}`, error);
    throw error;
  }
}

// クイズデータをアップロードする関数
async function uploadQuizData() {
  try {
    // 問題画像をアップロード
    console.log('📤 問題画像をアップロード中...');
    const problemImageAsset = await uploadImage(
      '/home/ubuntu/upload/matchstick_question_0817.png',
      'matchstick_question_0817.png'
    );
    
    // 正解画像をアップロード
    console.log('📤 正解画像をアップロード中...');
    const answerImageAsset = await uploadImage(
      '/home/ubuntu/upload/matchstick_answer_0817.png',
      'matchstick_answer_0817.png'
    );
    
    // カテゴリを作成（存在しない場合）
    console.log('📝 カテゴリを作成中...');
    const category = await client.createOrReplace({
      _id: 'category-matchstick-quiz',
      _type: 'category',
      title: 'マッチ棒クイズ',
      description: 'マッチ棒を1本動かして正しい式を作るクイズ'
    });
    
    // クイズドキュメントを作成
    console.log('📝 クイズデータを作成中...');
    const quizDocument = {
      _type: 'quiz',
      title: '【マッチ棒クイズ】1本だけ動かして正しい式に：9＋1＝8？',
      slug: {
        _type: 'slug',
        current: 'matchstick-quiz-9-plus-1-equals-8'
      },
      mainImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: problemImageAsset._id
        }
      },
      problemDescription: [
        {
          _type: 'block',
          _key: 'problem1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'span1',
              text: 'マッチ棒1本だけを別の場所へ移動して、式「9＋1＝8」を正しい等式に直してください。画像の中で"どの1本を動かすか"がポイントです。',
              marks: []
            }
          ],
          style: 'normal'
        }
      ],
      hint: [
        {
          _type: 'block',
          _key: 'hint1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'span2',
              text: 'まず右側の数字を観察。その下半分に、動かせそうな"余裕のある1本"があります。',
              marks: []
            }
          ],
          style: 'normal'
        },
        {
          _type: 'block',
          _key: 'hint2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'span3',
              text: '見つけた1本を左側の数字に移すと形が整います。',
              marks: []
            }
          ],
          style: 'normal'
        }
      ],
      adCode1: '',
      answerImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: answerImageAsset._id
        }
      },
      answerExplanation: [
        {
          _type: 'block',
          _key: 'answer1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'span4',
              text: '右の「8」から左下の縦1本を抜き、それを左の「9」の左下に移します。',
              marks: ['strong']
            }
          ],
          style: 'normal'
        },
        {
          _type: 'block',
          _key: 'answer2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'span5',
              text: 'よって式は 8＋1＝9 となり、正解です。',
              marks: ['strong']
            }
          ],
          style: 'normal'
        }
      ],
      adCode2: '',
      closingMessage: [
        {
          _type: 'block',
          _key: 'closing1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: 'span6',
              text: 'このシリーズは毎日更新。明日も新作を公開します。ブックマークしてまた挑戦してください！',
              marks: []
            }
          ],
          style: 'normal'
        }
      ],
      category: {
        _type: 'reference',
        _ref: 'category-matchstick-quiz'
      },
      difficulty: 'medium',
      publishedAt: '2024-08-17T00:00:00.000Z'
    };
    
    const result = await client.create(quizDocument);
    console.log('🎉 クイズデータのアップロード完了!');
    console.log('📄 ドキュメントID:', result._id);
    
    return result;
    
  } catch (error) {
    console.error('❌ アップロード失敗:', error);
    throw error;
  }
}

// スクリプト実行
if (process.env.SANITY_AUTH_TOKEN) {
  uploadQuizData()
    .then(() => {
      console.log('✅ 全ての処理が完了しました！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    });
} else {
  console.error('❌ SANITY_AUTH_TOKEN環境変数が設定されていません');
  process.exit(1);
}
