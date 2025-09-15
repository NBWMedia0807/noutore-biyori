// studio/schemaTypes/quiz.js
// 現行の管理画面をゼロから再構築（広告コード + ヒント複数 + 締め文 を含む）
export default {
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  fields: [
    // ── メタ ───────────────────────────
    { name: 'title', title: 'タイトル', type: 'string', validation: R => R.required() },
    {
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: R => R.required()
    },

    // ── 問題側 ────────────────────────
    { name: 'mainImage', title: '問題画像（Main Image）', type: 'image', options: { hotspot: true }, validation: R => R.required() },
    { name: 'problemDescription', title: '問題の補足', type: 'array', of: [{ type: 'block' }] },

    // ヒント（複数可）
    { name: 'hints', title: 'ヒント（複数可）', type: 'array', of: [{ type: 'block' }] },

    // レクタングル広告コード1（任意）
    { name: 'adCode1', title: 'レクタングル広告コード1', type: 'text', description: '広告コード等を貼り付ける欄です。空の場合は表示しません。' },

    // ── 解答側 ────────────────────────
    { name: 'answerImage', title: '正解画像（Answer Image）', type: 'image', options: { hotspot: true } },
    { name: 'answerExplanation', title: '正解の解説', type: 'array', of: [{ type: 'block' }] },

    // レクタングル広告コード2（任意）
    { name: 'adCode2', title: 'レクタングル広告コード2', type: 'text', description: '広告コード等を貼り付ける欄です。空の場合は表示しません。' },

    // 締め文（入稿がある場合のみ表示）
    { name: 'closingMessage', title: '締めテキスト', type: 'string' },

    // ── カテゴリ（最後に配置） ──────────
    {
      name: 'category',
      title: 'カテゴリ',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: R => R.required()
    }
  ]
}
