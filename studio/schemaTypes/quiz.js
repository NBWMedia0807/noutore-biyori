// studio/schemaTypes/quiz.js
export default {
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  fields: [
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
    { name: 'problemDescription', title: '問題の補足', type: 'array', of: [{ type: 'block' }] },
    { name: 'hints', title: 'ヒント（複数可）', type: 'array', of: [{ type: 'block' }] },
    { name: 'hint', title: 'ヒント（旧・互換）', type: 'text', hidden: true },
    { name: 'mainImage', title: '問題画像（Main Image）', type: 'image', options: {hotspot: true} },
    { name: 'answerImage', title: '正解画像（Answer Image）', type: 'image', options: {hotspot: true} },
    { name: 'answerExplanation', title: '正解の解説', type: 'array', of: [{ type: 'block' }] },
    { name: 'closingMessage', title: '締めテキスト', type: 'string' }
  ]
}
