// studio/schemaTypes/quiz.js
export default {
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  fields: [
    // ── メタ ─────────────────────────────────────────────
    { name: 'title', title: 'タイトル', type: 'string', validation: R => R.required() },
    {
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: R => R.required()
    },
    {
      name: 'category',
      title: 'カテゴリ',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: R => R.required()
    },

    // ── 問題側（この順でStudioに並びます） ────────────────
    { name: 'mainImage', title: '問題画像（Main Image）', type: 'image', options: { hotspot: true }, validation: R => R.required() },

    // ① 問題の補足
    { name: 'problemDescription', title: '問題の補足', type: 'array', of: [{ type: 'block' }] },

    // ② ヒント（新しい“枠”）…「問題の補足」と広告コード1の間に入れる想定
    {
      name: 'hints',
      title: 'ヒント（複数可）',
      type: 'array',
      of: [{ type: 'block' }],
      description: '短文1〜3個推奨。ヒントが入力されている場合はページ区切りのトリガーになります。'
    },

    // 旧互換（文字列）。表示側は「hints なければ hint を使う」フォールバックで参照
    { name: 'hint', title: 'ヒント（旧・互換）', type: 'text', hidden: true },

    // ── 解答側 ──────────────────────────────────────────
    { name: 'answerImage', title: '正解画像（Answer Image）', type: 'image', options: { hotspot: true } },
    { name: 'answerExplanation', title: '正解の解説', type: 'array', of: [{ type: 'block' }] },

    // ③ 締め文（「正解への補足」と「カテゴリ」の間に出す想定）
    {
      name: 'closingMessage',
      title: '締めテキスト',
      type: 'string'
    }
  ]
}
