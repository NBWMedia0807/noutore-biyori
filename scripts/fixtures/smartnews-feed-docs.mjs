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
//   - 生成が止まったカテゴリの古い記事（カテゴリ枠から除外されるか）
//
// 公開日は実行時刻からの相対で生成する。枠配分の鮮度判定（FRESHNESS_DAYS）を含む
// テストが、時間の経過で壊れないようにするため。

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

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const category = (slug, title) => ({ _id: `category-${slug}`, name: title, title, slug });

/** デイリー生成されている8カテゴリ（マッチ棒以外）。各カテゴリが1枠を取る。 */
export const ACTIVE_CATEGORIES = [
  ['kanji-quiz', '難読漢字クイズ'],
  ['crossword-quiz', '二字熟語クロスワード'],
  ['yoji-quiz', '四字熟語穴埋め'],
  ['number-quiz', '数字クイズ'],
  ['arithmetic-quiz', '計算クイズ'],
  ['formula-puzzle', '数式パズル'],
  ['anagram-quiz', 'アナグラム'],
  ['mushikui-quiz', '虫食い算クイズ'],
];

/** 生成が止まったカテゴリ（古い記事しか無い）。枠を取ってはいけない。 */
export const DORMANT_CATEGORIES = [
  ['time-quiz', '時計クイズ'],
  ['money-quiz', 'お金クイズ'],
];

const quiz = ({
  id,
  slug,
  title,
  categorySlug,
  categoryTitle,
  publishedAt,
  withImages = true,
}) => ({
  _id: id,
  _type: 'quiz',
  publishedAt: new Date(publishedAt).toISOString(),
  _createdAt: new Date(publishedAt - HOUR).toISOString(),
  title,
  slug,
  seoDescription: `${title}の問題です。`,
  problemDescription: [block(`${title}に挑戦してみてください。`)],
  hints: [block('ヒント: よく見ると規則性があります。')],
  answerExplanation: [block('正解の解説です。')],
  closingMessage: [block('また明日も挑戦してみてください。')],
  mainImage: withImages ? image(`${id}-main`, title) : null,
  problemImage: withImages ? image(`${id}-problem`, `${title}の問題`) : null,
  answerImage: withImages ? image(`${id}-answer`, `${title}の答え`) : null,
  category: categorySlug ? category(categorySlug, categoryTitle) : null,
  relatedLinks: [],
});

/**
 * 記事本体（RSS_SMARTNEWS_MATCHSTICK_QUERY / RSS_SMARTNEWS_OTHERS_QUERY 相当）。
 * 呼び出し側でマッチ棒かどうかを振り分ける。
 */
export const createSmartnewsFixtureArticles = (now = Date.now()) => {
  const articles = [];

  // マッチ棒クイズ 25本（1日5本 × 5日ぶん相当）。すべて新しい。
  for (let i = 0; i < 25; i += 1) {
    articles.push(
      quiz({
        id: `quiz-matchstick-${3200 - i}`,
        slug: `matchstick-quiz/matchstick-${3200 - i}`,
        title: `マッチ棒クイズ「1本動かして正しい式に」#${3200 - i}`,
        categorySlug: 'matchstick-quiz',
        categoryTitle: 'マッチ棒クイズ',
        publishedAt: now - i * 5 * HOUR,
      })
    );
  }

  // デイリー生成の8カテゴリ。各2本（新しい方がカテゴリ枠に入る）。
  // 2時間ぶん古くしてあるのは、下の「エスケープ検証用の難読漢字」を
  // kanji-quiz の最新記事にしてフィードへ確実に入れるため。
  ACTIVE_CATEGORIES.forEach(([slug, title], index) => {
    for (let n = 0; n < 2; n += 1) {
      articles.push(
        quiz({
          id: `quiz-${slug}-${n}`,
          slug: `${slug}-${100 + n}`,
          title: `${title} 第${100 + n}問`,
          categorySlug: slug,
          categoryTitle: title,
          publishedAt: now - (2 * HOUR + index * HOUR + n * DAY),
          // 1カテゴリだけ画像なしにして、img を出していないことを検証できるようにする
          withImages: slug !== 'mushikui-quiz',
        })
      );
    }
  });

  // エスケープ・CDATA の検証用。難読漢字の最新記事として必ずフィードに入る。
  articles.push({
    ...quiz({
      id: 'quiz-kanji-special',
      slug: 'kanji-001',
      title: '難読漢字 <漢字&熟語> "上級編" の\'挑戦\'',
      categorySlug: 'kanji-quiz',
      categoryTitle: '難読漢字クイズ',
      publishedAt: now - 1 * HOUR,
    }),
    problemDescription: [block('この漢字を読めますか？ 5 < 10 かつ 10 > 5 のヒントつき。')],
    hints: [block('ヒント: ]]> という文字列が本文に出ても CDATA を壊さないこと。')],
    relatedLinks: [
      {
        _type: 'quiz',
        title: '難読漢字クイズ 第100問',
        slug: 'kanji-quiz-100',
        categorySlug: 'kanji-quiz',
        problemImage: image('kanji-quiz-0-problem', '難読漢字の問題'),
      },
      {
        _type: 'quiz',
        title: '難読漢字クイズ 第101問',
        slug: 'kanji-quiz-101',
        categorySlug: 'kanji-quiz',
        problemImage: image('kanji-quiz-1-problem', '難読漢字の問題'),
      },
    ],
  });

  // 生成が止まったカテゴリ。古いのでカテゴリ枠に入ってはいけない。
  DORMANT_CATEGORIES.forEach(([slug, title], index) => {
    articles.push(
      quiz({
        id: `quiz-${slug}-old`,
        slug: `${slug}-1`,
        title: `${title} 第1問`,
        categorySlug: slug,
        categoryTitle: title,
        publishedAt: now - (60 + index * 30) * DAY,
      })
    );
  });

  // カテゴリの無いコラム。カテゴリ枠を取らないので配信対象にはならない
  // （枠配分の前もマッチ棒が30枠を占めていたため、従来も配信されていなかった）。
  articles.push({
    _id: 'post-column-001',
    _type: 'post',
    publishedAt: new Date(now - 2 * HOUR).toISOString(),
    _createdAt: new Date(now - 3 * HOUR).toISOString(),
    title: '脳トレを続けるコツ',
    slug: 'column-001',
    seoDescription: '毎日の習慣づくりについてのコラム。',
    body: [block('短いコラム本文。継続のコツを紹介します。')],
    mainImage: image('column-001-main', 'コラム'),
    problemImage: null,
    answerImage: null,
    category: null,
    relatedLinks: [],
  });

  return articles;
};

/**
 * 回遊枠のフォールバック用「サイト全体の新着」プール
 * （globalLatestQuizzesQuery 相当）
 */
export const createSmartnewsFixtureLatestQuizzes = () => [
  {
    _type: 'quiz',
    title: '難読漢字 <漢字&熟語> "上級編" の\'挑戦\'',
    slug: 'kanji-001',
    categorySlug: 'kanji-quiz',
    problemImage: image('kanji-001-problem', '難読漢字の問題'),
    mainImage: image('kanji-001-main', '難読漢字'),
  },
  {
    _type: 'quiz',
    title: 'マッチ棒クイズ「1本動かして正しい式に」',
    slug: 'matchstick-quiz/matchstick-001',
    categorySlug: 'matchstick-quiz',
    problemImage: image('matchstick-problem', 'マッチ棒クイズの問題'),
    mainImage: image('matchstick-main', 'マッチ棒クイズ'),
  },
  {
    _type: 'quiz',
    title: '間違い探し「公園の風景」',
    slug: 'spot-001',
    categorySlug: 'spot-the-difference',
    problemImage: null,
    mainImage: image('spot-001-main', '間違い探し'),
  },
  ...Array.from({ length: 6 }, (_, i) => ({
    _type: 'quiz',
    title: `計算クイズ ${i + 1}`,
    slug: `number-${String(i + 1).padStart(3, '0')}`,
    categorySlug: 'number-quiz',
    problemImage: image(`number-${i + 1}-problem`, '計算クイズの問題'),
    mainImage: null,
  })),
];

/**
 * マッチ棒クイズの新着プール（matchstickQuizzesQuery 相当）。
 *
 * マッチ棒記事を表示しているときは広告枠2 + 本文末3 + 関連記事枠3 の
 * 合計8枠をここから取るため、自記事を除いて8件以上になるようにしている。
 */
export const createSmartnewsFixtureMatchstickQuizzes = () =>
  Array.from({ length: 9 }, (_, i) => ({
    _type: 'quiz',
    title: `マッチ棒クイズ ${String(i + 1).padStart(3, '0')}`,
    slug: `matchstick-quiz/matchstick-${String(i + 1).padStart(3, '0')}`,
    categorySlug: 'matchstick-quiz',
    problemImage: image(`matchstick-${i + 1}-problem`, 'マッチ棒クイズの問題'),
    mainImage: null,
  }));
