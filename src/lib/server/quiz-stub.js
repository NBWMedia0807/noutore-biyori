import { createSlugQueryPayload } from '$lib/utils/slug.js';

const hasStructuredClone = typeof globalThis.structuredClone === 'function';
const clone = (value) => (hasStructuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const fallbackTitleFromSlug = (value) => {
  const sanitized = sanitizeText(value);
  if (!sanitized) return '';
  return sanitized.replace(/[-_]+/g, ' ');
};

const STUB_QUIZZES = [
  {
    _id: 'stub-quiz-a',
    slug: 'sample-quiz-a',
    title: 'サンプルクイズA',
    category: { title: 'サンプルカテゴリ', slug: 'sample-category' },
    mainImage: null,
    problemImage: null,
    problemDescription: '図形の位置関係から隠れた規則を見つけてください。',
    hints: [
      { _type: 'block', children: [{ _type: 'span', text: 'ヒント1: 左右の並びに注目しましょう。' }] },
      { _type: 'block', children: [{ _type: 'span', text: 'ヒント2: 数字と図形の対応関係を確認してください。' }] }
    ],
    adCode1: '',
    adCode2: '',
    answerImage: null,
    answerExplanation: [
      { _type: 'block', children: [{ _type: 'span', text: '図形の位置を数字に置き換えると答えが導けます。' }] }
    ],
    closingMessage: [
      { _type: 'block', children: [{ _type: 'span', text: '明日も新しい問題を公開予定です。ぜひ挑戦してください！' }] }
    ],
    publishedAt: '2024-01-01T00:00:00Z',
    _createdAt: '2024-01-01T00:00:00Z',
    _updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    _id: 'stub-quiz-b',
    slug: 'sample-quiz-b',
    title: 'サンプルクイズB',
    category: { title: 'マッチ棒クイズ', slug: 'matchstick' },
    mainImage: null,
    problemImage: null,
    problemDescription: 'マッチ棒を一本だけ動かして正しい式にしてください。',
    hints: [
      { _type: 'block', children: [{ _type: 'span', text: 'ヒント1: 記号を変化させると解決できるかも。' }] }
    ],
    adCode1: '',
    adCode2: '',
    answerImage: null,
    answerExplanation: [
      { _type: 'block', children: [{ _type: 'span', text: 'マッチ棒を+から-に変えて正しい式を作ります。' }] }
    ],
    closingMessage: [
      { _type: 'block', children: [{ _type: 'span', text: '他のマッチ棒クイズにも挑戦してみましょう！' }] }
    ],
    publishedAt: '2024-01-05T00:00:00Z',
    _createdAt: '2024-01-05T00:00:00Z',
    _updatedAt: '2024-01-06T00:00:00Z'
  },
  {
    _id: 'stub-quiz-c',
    slug: 'spot-the-difference-sample',
    title: 'サンプル間違い探し',
    category: { title: '間違い探し', slug: 'spot-the-difference' },
    mainImage: null,
    problemImage: null,
    problemDescription: '2枚のイラストから異なる部分を3つ見つけてください。',
    hints: [
      { _type: 'block', children: [{ _type: 'span', text: 'ヒント1: キャラクターの持ち物に注目。' }] },
      { _type: 'block', children: [{ _type: 'span', text: 'ヒント2: 背景の小物も確認しましょう。' }] }
    ],
    adCode1: '',
    adCode2: '',
    answerImage: null,
    answerExplanation: [
      {
        _type: 'block',
        children: [{ _type: 'span', text: '帽子の模様、テーブル上のカップ、壁の絵が異なっています。' }]
      }
    ],
    closingMessage: [
      {
        _type: 'block',
        children: [{ _type: 'span', text: '他の間違い探しにも挑戦して観察力を鍛えましょう！' }]
      }
    ],
    publishedAt: '2024-01-10T00:00:00Z',
    _createdAt: '2024-01-10T00:00:00Z',
    _updatedAt: '2024-01-11T00:00:00Z'
  },
  {
    _id: 'stub-quiz-d',
    slug: 'crossword-sample',
    title: 'サンプルクロスワード',
    category: { title: 'クロスワード', slug: 'crossword' },
    mainImage: null,
    problemImage: null,
    problemDescription:
      'タテとヨコのカギをヒントにマスを埋めて、中央の赤いマスに入る文字を完成させましょう。',
    hints: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'タテのカギ3番は「朝に飲む温かい飲み物」です。'
          }
        ]
      }
    ],
    adCode1: '',
    adCode2: '',
    answerImage: null,
    answerExplanation: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: '全てのマスを埋めると中央の赤いマスには「脳」という文字が入ります。'
          }
        ]
      }
    ],
    closingMessage: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: '次回のクロスワードもお楽しみに！'
          }
        ]
      }
    ],
    publishedAt: '2024-01-15T00:00:00Z',
    _createdAt: '2024-01-15T00:00:00Z',
    _updatedAt: '2024-01-16T00:00:00Z'
  },
  {
    _id: 'stub-quiz-e',
    slug: 'kanji-mistake-sample',
    title: 'サンプル漢字間違え探し',
    category: { title: '漢字間違え探し', slug: 'kanji-mistake' },
    mainImage: null,
    problemImage: null,
    problemDescription:
      '表示された9つの漢字の中に、1つだけ誤った漢字が紛れています。どれか探してください。',
    hints: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: '左下の漢字に注目すると間違いが見えてきます。'
          }
        ]
      }
    ],
    adCode1: '',
    adCode2: '',
    answerImage: null,
    answerExplanation: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: '「曜」という漢字の「日」が「田」になっているものが間違いです。'
          }
        ]
      }
    ],
    closingMessage: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: '他の漢字間違え探しにも挑戦してみましょう！'
          }
        ]
      }
    ],
    publishedAt: '2024-01-20T00:00:00Z',
    _createdAt: '2024-01-20T00:00:00Z',
    _updatedAt: '2024-01-21T00:00:00Z'
  }
];

export const isQuizStubEnabled = () => {
  const flag = (process.env.ENABLE_QUIZ_STUB || '').toLowerCase();
  return flag === '1' || flag === 'true';
};

export const getQuizStubCatalog = () =>
  STUB_QUIZZES.map((doc) => ({
    _id: doc._id,
    slug: doc.slug,
    publishedAt: doc.publishedAt,
    _createdAt: doc._createdAt,
    _updatedAt: doc._updatedAt
  }));

export const getQuizStubDocument = (slug) => {
  const doc = STUB_QUIZZES.find((entry) => entry.slug === slug);
  return doc ? clone(doc) : null;
};

export const getQuizStubCategories = () => {
  const map = new Map();
  for (const doc of STUB_QUIZZES) {
    const category = doc?.category;
    if (!category || typeof category.slug !== 'string' || typeof category.title !== 'string') {
      continue;
    }
    const slug = sanitizeText(category.slug);
    const title = sanitizeText(category.title);
    if (!slug || !title || map.has(slug)) continue;
    map.set(slug, { slug, title });
  }

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'ja'));
};

export const getQuizStubCategory = (slug) => {
  const normalizedSlug = sanitizeText(slug);
  if (!normalizedSlug) return null;

  for (const doc of STUB_QUIZZES) {
    const categorySlug = sanitizeText(doc?.category?.slug);
    if (!categorySlug || categorySlug !== normalizedSlug) continue;
    const title = sanitizeText(doc.category.title) || fallbackTitleFromSlug(normalizedSlug) || normalizedSlug;
    return { slug: categorySlug, title };
  }

  return null;
};

export const getQuizStubQuizzesByCategory = (slug) => {
  const normalizedSlug = sanitizeText(slug);
  if (!normalizedSlug) return [];

  return STUB_QUIZZES.filter((doc) => sanitizeText(doc?.category?.slug) === normalizedSlug).map((doc) =>
    clone({
      ...doc,
      category: doc?.category
        ? {
            slug: sanitizeText(doc.category.slug) || normalizedSlug,
            title:
              sanitizeText(doc.category.title) || fallbackTitleFromSlug(normalizedSlug) || normalizedSlug
          }
        : null
    })
  );
};

export const resolveQuizStubSlug = (slugCandidates, lowerSlugCandidates) => {
  const slugCandidateSet = new Set(slugCandidates);
  const lowerCandidateSet = new Set(lowerSlugCandidates);

  for (const doc of STUB_QUIZZES) {
    if (slugCandidateSet.has(doc.slug) || slugCandidateSet.has(doc._id)) {
      return doc.slug;
    }

    const { candidates, lowerCandidates } = createSlugQueryPayload(doc.slug);
    if (
      candidates.some((value) => slugCandidateSet.has(value)) ||
      lowerCandidates.some((value) => lowerCandidateSet.has(value))
    ) {
      return doc.slug;
    }
  }

  return null;
};
