import { createSlugQueryPayload } from '$lib/utils/slug.js';

const hasStructuredClone = typeof globalThis.structuredClone === 'function';
const clone = (value) => (hasStructuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

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
    _createdAt: '2024-01-05T00:00:00Z',
    _updatedAt: '2024-01-06T00:00:00Z'
  }
];

export const isQuizStubEnabled = () => {
  const flag = (process.env.ENABLE_QUIZ_STUB || '').toLowerCase();
  return flag === '1' || flag === 'true';
};

export const getQuizStubCatalog = () =>
  STUB_QUIZZES.map((doc) => ({ _id: doc._id, slug: doc.slug, _updatedAt: doc._updatedAt }));

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
    const slug = category.slug.trim();
    const title = category.title.trim();
    if (!slug || !title || map.has(slug)) continue;
    map.set(slug, { slug, title });
  }

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'ja'));
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
