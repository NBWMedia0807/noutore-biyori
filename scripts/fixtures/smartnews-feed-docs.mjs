// scripts/fixtures/smartnews-feed-docs.mjs
//
// SmartNews / ママテナ / イチオシ 共通フィード（/feed/smartnews）の検証用サンプル記事。
// Sanity から返ってくる形（rssSmartnews.groq.js の投影）に合わせてある。
//
// 仕様上つまずきやすいケースを意図的に混ぜている:
//   - タイトル・本文に & " ' < > を含む記事（エスケープ漏れの検出）
//   - 本文に "]]>" を含む記事（CDATA が途中で閉じないかの検出）
//   - 画像が1枚も無い記事（img タグを出していないか）
//   - スラッグに "/" を含む記事（/quiz/{slug} 形式のまま維持されるか）
//   - _type: 'post' の記事（クイズ用の見出しを付けていないか）

const image = (id, alt) => ({
  _type: 'image',
  alt,
  asset: { _id: `image-${id}-1200x800-jpg`, _type: 'sanity.imageAsset' },
});

const block = (text) => ({
  _type: 'block',
  style: 'normal',
  children: [{ _type: 'span', text }],
});

const CATEGORY_KANJI = {
  _id: 'category-kanji',
  name: '漢字クイズ',
  title: '漢字クイズ',
  slug: 'kanji-quiz',
};

const CATEGORY_MATCHSTICK = {
  _id: 'category-matchstick',
  name: 'マッチ棒クイズ',
  title: 'マッチ棒クイズ',
  slug: 'matchstick-quiz',
};

/** 記事本体（RSS_SMARTNEWS_QUERY 相当） */
export const createSmartnewsFixtureArticles = () => [
  {
    _id: 'quiz-matchstick-001',
    _type: 'quiz',
    publishedAt: '2026-09-10T00:00:00.000Z',
    _createdAt: '2026-09-09T00:00:00.000Z',
    title: 'マッチ棒クイズ「1本動かして正しい式に」',
    slug: 'matchstick-quiz/matchstick-001',
    seoDescription: 'マッチ棒を1本だけ動かして式を成立させる問題です。',
    problemDescription: [block('マッチ棒を1本だけ動かして、正しい式にしてください。')],
    hints: [block('答えは1つではありません。')],
    answerExplanation: [block('左の縦棒を移動させると成立します。')],
    closingMessage: [block('また明日も挑戦してみてください。')],
    mainImage: image('matchstick-main', 'マッチ棒クイズ'),
    problemImage: image('matchstick-problem', 'マッチ棒クイズの問題'),
    answerImage: image('matchstick-answer', 'マッチ棒クイズの答え'),
    category: CATEGORY_MATCHSTICK,
    relatedLinks: [
      {
        _type: 'quiz',
        title: '難読漢字「憂鬱」を読めますか？',
        slug: 'kanji-001',
        categorySlug: 'kanji-quiz',
        problemImage: image('kanji-001-problem', '難読漢字'),
      },
    ],
  },
  {
    _id: 'quiz-kanji-001',
    _type: 'quiz',
    publishedAt: '2026-09-11T00:00:00.000Z',
    _createdAt: '2026-09-10T00:00:00.000Z',
    // 属性値・テキストのエスケープ漏れを検出させるためのタイトル
    title: '難読漢字 <漢字&熟語> "上級編" の\'挑戦\'',
    slug: 'kanji-001',
    seoDescription: '難読漢字の上級編クイズ & 解説つき。',
    problemDescription: [block('この漢字を読めますか？ 5 < 10 かつ 10 > 5 のヒントつき。')],
    hints: [block('ヒント: ]]> という文字列が本文に出ても CDATA を壊さないこと。')],
    answerExplanation: [block('正解は「ゆううつ」です。')],
    closingMessage: [block('おつかれさまでした。')],
    mainImage: image('kanji-001-main', '難読漢字'),
    problemImage: image('kanji-001-problem', '難読漢字の問題'),
    answerImage: null,
    category: CATEGORY_KANJI,
    relatedLinks: [
      {
        _type: 'quiz',
        title: 'マッチ棒クイズ「1本動かして正しい式に」',
        slug: 'matchstick-quiz/matchstick-001',
        categorySlug: 'matchstick-quiz',
        problemImage: image('matchstick-problem', 'マッチ棒クイズの問題'),
      },
      {
        _type: 'quiz',
        title: '間違い探し「公園の風景」',
        slug: 'spot-001',
        categorySlug: 'spot-the-difference',
        mainImage: image('spot-001-main', '間違い探し'),
      },
    ],
  },
  {
    _id: 'quiz-no-image',
    _type: 'quiz',
    publishedAt: '2026-09-09T00:00:00.000Z',
    _createdAt: '2026-09-08T00:00:00.000Z',
    title: '画像が1枚も無いクイズ',
    slug: 'no-image-001',
    seoDescription: '',
    problemDescription: [block('画像が無い場合でもフィードが壊れないことを確認する。')],
    hints: null,
    answerExplanation: [block('正解は「なし」です。')],
    closingMessage: null,
    mainImage: null,
    problemImage: null,
    answerImage: null,
    category: CATEGORY_KANJI,
    relatedLinks: [],
  },
  {
    _id: 'post-column-001',
    _type: 'post',
    publishedAt: '2026-09-08T00:00:00.000Z',
    _createdAt: '2026-09-07T00:00:00.000Z',
    title: '脳トレを続けるコツ',
    slug: 'column-001',
    seoDescription: '毎日の習慣づくりについてのコラム。',
    body: [block('短いコラム本文。継続のコツを紹介します。')],
    mainImage: image('column-001-main', 'コラム'),
    problemImage: null,
    answerImage: null,
    category: null,
    relatedLinks: [],
  },
];

/** 広告枠（snf:advertisement）用の最新クイズ一覧 */
export const createSmartnewsFixtureLatestQuizzes = () => [
  {
    title: '難読漢字 <漢字&熟語> "上級編" の\'挑戦\'',
    slug: 'kanji-001',
    categorySlug: 'kanji-quiz',
    problemImage: image('kanji-001-problem', '難読漢字の問題'),
    mainImage: image('kanji-001-main', '難読漢字'),
  },
  {
    title: 'マッチ棒クイズ「1本動かして正しい式に」',
    slug: 'matchstick-quiz/matchstick-001',
    categorySlug: 'matchstick-quiz',
    problemImage: image('matchstick-problem', 'マッチ棒クイズの問題'),
    mainImage: image('matchstick-main', 'マッチ棒クイズ'),
  },
  {
    title: '間違い探し「公園の風景」',
    slug: 'spot-001',
    categorySlug: 'spot-the-difference',
    problemImage: null,
    mainImage: image('spot-001-main', '間違い探し'),
  },
];
