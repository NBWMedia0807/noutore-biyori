// studio/schemaTypes/category.js
export default {
  name: 'category',
  title: 'カテゴリ',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'タイトル',
      type: 'string',
      validation: R => R.required()
    },
    {
      name: 'description',
      title: '説明',
      type: 'text'
    }
  ]
}

