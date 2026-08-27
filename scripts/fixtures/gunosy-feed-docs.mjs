// scripts/fixtures/gunosy-feed-docs.mjs
//
// GunosyFeed のセルフチェック用サンプル記事。
// Sanity から返ってくる形（rssGunosy.groq.js の投影）に合わせてあり、
// 実データを叩けない環境でもフィードの組み立てを検証できるようにするためのもの。
//
// 仕様上つまずきやすいケースを意図的に混ぜている:
//   - タイトル・本文に & " ' < > を含む記事（エスケープ漏れの検出）
//   - 画像が1枚も無い記事（enclosure を省略できているか）
//   - 関連記事が4件以上ある記事（gnf:relatedLink が最大3件に収まるか）
//   - 本文にリンクマークが付いた記事（本文からリンクを外せているか）
//   - 箇条書き・見出し・改行を含む本文

const CDN = 'https://cdn.sanity.io/images/quljge22/production';

/** $lib/rss/images.js の buildImageUrl と同じ形の URL を返すスタブ */
export const buildImageUrl = (source, { width, height, format } = {}) => {
  if (!source) return null;
  const assetId = source?.asset?._id;
  if (typeof assetId !== 'string' || !assetId) return null;
  const base = assetId.replace(/^image-/, '').replace(/-(jpg|png|webp)$/, '.$1');
  const params = [];
  if (width) params.push(`w=${Math.round(width)}`);
  if (height) params.push(`h=${Math.round(height)}`, 'fit=crop');
  params.push(format && format !== 'auto' ? `fm=${format}` : 'auto=format');
  return `${CDN}/${base}?${params.join('&')}`;
};

const image = (id, alt) => ({
  alt,
  asset: {
    _id: `image-${id}-1200x800-jpg`,
    url: `${CDN}/${id}-1200x800.jpg`,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    metadata: { dimensions: { width: 1200, height: 800 } },
  },
});

const block = (text, style = 'normal') => ({
  _type: 'block',
  style,
  children: [{ _type: 'span', text }],
});

const listItem = (text) => ({
  _type: 'block',
  style: 'normal',
  listItem: 'bullet',
  children: [{ _type: 'span', text }],
});

const daysAgo = (days, now) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const relatedRef = (index, categorySlug, now) => ({
  _id: `quiz-related-${index}`,
  title: `関連する脳トレ問題 その${index}`,
  slug: `related-quiz-${index}`,
  categorySlug,
  image: image(`related-${index}`, ''),
  visible: true,
  publishedAt: daysAgo(index, now),
});

/**
 * サンプル記事一式と、それに対応する buildImageUrl スタブを返す。
 * @param {{now?: Date}} [options]
 */
export const createFixtureDocs = ({ now = new Date() } = {}) => {
  const docs = [
    {
      _id: 'quiz-standard-001',
      _updatedAt: daysAgo(0.5, now),
      publishedAt: daysAgo(1, now),
      _createdAt: daysAgo(1, now),
      title: 'マッチ棒を1本動かして正しい式にしよう',
      slug: 'matchstick-001',
      seoDescription:
        'マッチ棒を1本だけ動かして式を成立させる脳トレ問題です。ヒントと解説つきで、はじめての方でも楽しめます。',
      problemDescription: [
        block('下の式はまちがっています。マッチ棒を1本だけ動かして、正しい式にしてください。'),
        block('制限時間は3分です。'),
      ],
      hints: [listItem('記号に注目してみましょう'), listItem('数字の形も変えられます')],
      answerExplanation: [
        block('答え', 'h3'),
        block('「＋」から1本を動かして「－」にすると式が成立します。'),
      ],
      closingMessage: [block('毎日1問ずつ解くと、数字への感覚が育ちます。')],
      problemImage: image('matchstick-001-problem', 'マッチ棒で作られた式'),
      mainImage: image('matchstick-001-problem', 'マッチ棒で作られた式'),
      answerImage: image('matchstick-001-answer', '正解のマッチ棒の並び'),
      author: { name: '脳トレ日和 編集部' },
      category: {
        _id: 'cat-matchstick',
        title: 'マッチ棒クイズ',
        name: 'マッチ棒クイズ',
        slug: 'matchstick-quiz',
      },
      manualRelated: [relatedRef(1, 'matchstick-quiz', now), relatedRef(2, 'matchstick-quiz', now)],
      autoRelated: [
        relatedRef(3, 'matchstick-quiz', now),
        relatedRef(4, 'matchstick-quiz', now),
        relatedRef(5, 'matchstick-quiz', now),
      ],
    },
    {
      // 特殊文字とリンクマークを含む記事
      _id: 'quiz-escape-002',
      _updatedAt: daysAgo(2, now),
      publishedAt: daysAgo(2, now),
      _createdAt: daysAgo(2, now),
      title: '「&」と<記号>を使った"難読"漢字クイズ',
      slug: 'nandoku-002',
      seoDescription:
        '記号まじりの難読漢字クイズ。読み方がわかりますか？ & < > " \' を含むテスト用タイトルです。',
      problemDescription: [
        {
          _type: 'block',
          style: 'normal',
          children: [
            { _type: 'span', text: '次の漢字の読み方は？ ' },
            {
              _type: 'span',
              text: '答えはこちらの記事',
              marks: ['link-key-1'],
            },
            { _type: 'span', text: ' を参考にしてください。' },
          ],
          markDefs: [{ _key: 'link-key-1', _type: 'link', href: 'https://example.com/other' }],
        },
        block('ヒントは「食べ物」です。\n\n落ち着いて考えてみましょう。'),
      ],
      hints: [block('部首に注目してください。')],
      answerExplanation: [block('正解は「たんぽぽ」でした。5 < 10 かつ 10 > 5 です。')],
      closingMessage: [],
      problemImage: image('nandoku-002-problem', ''),
      mainImage: null,
      answerImage: null,
      author: { name: '脳トレ日和 編集部' },
      category: { _id: 'cat-nandoku', title: '難読漢字', name: '難読漢字', slug: 'nandoku-kanji' },
      manualRelated: [],
      autoRelated: [relatedRef(6, 'nandoku-kanji', now)],
    },
    {
      // 画像が1枚も無い記事（enclosure を省略する）
      _id: 'quiz-noimage-003',
      _updatedAt: daysAgo(3, now),
      publishedAt: daysAgo(3, now),
      _createdAt: daysAgo(3, now),
      title: '暗算で解く3ケタの計算問題',
      slug: 'calc-003',
      seoDescription: '',
      problemDescription: [block('123 + 456 - 78 はいくつになるでしょう。')],
      hints: [block('先に足し算を済ませましょう。')],
      answerExplanation: [block('答えは 501 です。')],
      closingMessage: [block('計算は毎日の習慣づけが近道です。')],
      problemImage: null,
      mainImage: null,
      answerImage: null,
      author: null,
      category: { _id: 'cat-number', title: '数字クイズ', name: '数字クイズ', slug: 'number-quiz' },
      manualRelated: [],
      autoRelated: [],
    },
    {
      // 非公開の関連記事が混ざっている記事
      _id: 'quiz-related-004',
      _updatedAt: daysAgo(4, now),
      publishedAt: daysAgo(4, now),
      _createdAt: daysAgo(4, now),
      title: '間違い探し：公園のイラストで5つのちがいを探そう',
      slug: 'spot-004',
      seoDescription: '公園のイラストから5つのちがいを探す間違い探しです。',
      problemDescription: [block('2枚のイラストを見比べて、ちがう場所を5つ見つけてください。')],
      hints: [listItem('ベンチのまわり'), listItem('空の様子')],
      answerExplanation: [block('ちがいは帽子・ベンチ・雲・花・かばんの5か所でした。')],
      closingMessage: [block('見つけられましたか？')],
      problemImage: image('spot-004-problem', '公園のイラスト'),
      mainImage: null,
      answerImage: image('spot-004-answer', '正解を示した公園のイラスト'),
      author: { name: '脳トレ日和 編集部' },
      category: {
        _id: 'cat-spot',
        title: '間違い探し',
        name: '間違い探し',
        slug: 'spot-the-difference',
      },
      manualRelated: [
        { ...relatedRef(7, 'spot-the-difference', now), visible: false },
        relatedRef(8, 'spot-the-difference', now),
      ],
      autoRelated: [relatedRef(9, 'spot-the-difference', now)],
    },
    {
      _id: 'quiz-recent-005',
      _updatedAt: daysAgo(0.1, now),
      publishedAt: daysAgo(0.2, now),
      _createdAt: daysAgo(0.2, now),
      title: 'ことわざの穴埋めクイズ',
      slug: 'kotowaza-005',
      seoDescription: '有名なことわざの一部が隠れています。空欄に入る言葉を考えてみましょう。',
      problemDescription: [block('「石の上にも◯◯」——◯◯に入る言葉は？')],
      hints: [block('数字が入ります。')],
      answerExplanation: [block('正解は「三年」です。')],
      closingMessage: [block('ことわざは語彙力アップにも役立ちます。')],
      problemImage: image('kotowaza-005-problem', ''),
      mainImage: null,
      answerImage: null,
      author: { name: '脳トレ日和 編集部' },
      category: { _id: 'cat-kotowaza', title: 'ことわざ', name: 'ことわざ', slug: 'kotowaza' },
      manualRelated: [],
      autoRelated: [relatedRef(10, 'kotowaza', now)],
    },
  ];

  return { docs, buildImageUrl };
};
