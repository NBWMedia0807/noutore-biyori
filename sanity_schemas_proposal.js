/*
  Sanity Studioのschemasディレクトリに以下のファイルを配置してください。
  例: `schemas/quiz.js`
*/

export default {
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'タイトル',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: (Rule) => Rule.required()
    },
    {
      name: 'mainImage',
      title: '問題画像',
      type: 'image',
      options: {
        hotspot: true
      },
      validation: (Rule) => Rule.required()
    },
    {
      name: 'problemDescription',
      title: '問題の補足',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: '標準', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: '太字', value: 'strong' },
              { title: '斜体', value: 'em' }
            ],
            annotations: []
          }
        }
      ]
    },
    {
      name: 'hint',
      title: 'ヒント',
      description: '必要に応じて複数のヒントを追加できます。',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: '標準', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: '太字', value: 'strong' },
              { title: '斜体', value: 'em' }
            ],
            annotations: []
          }
        }
      ]
    },
    {
      name: 'adCode1',
      title: 'レクタングル広告コード1',
      description: '広告コード等を貼り付ける欄です。空の場合は表示しません。',
      type: 'text'
    },
    {
      name: 'answerImage',
      title: '正解画像',
      type: 'image',
      options: {
        hotspot: true
      },
      validation: (Rule) => Rule.required()
    },
    {
      name: 'answerExplanation',
      title: '正解への補足テキスト',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: '標準', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: '太字', value: 'strong' },
              { title: '斜体', value: 'em' }
            ],
            annotations: []
          }
        }
      ]
    },
    {
      name: 'adCode2',
      title: 'レクタングル広告コード2',
      description: '広告コード等を貼り付ける欄です。空の場合は表示しません。',
      type: 'text'
    },
    {
      name: 'closingMessage',
      title: '締め文',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: '標準', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: '太字', value: 'strong' },
              { title: '斜体', value: 'em' }
            ],
            annotations: []
          }
        }
      ]
    },
    {
      name: 'category',
      title: 'カテゴリ',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (Rule) => Rule.required()
    }
  ]
};

/*
  Sanity Studioのschemasディレクトリに以下のファイルを配置してください。
  例: `schemas/category.js`
*/

export const categorySchema = {
  name: 'category',
  title: 'カテゴリ',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'タイトル',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: (Rule) => Rule.required()
    },
    {
      name: 'description',
      title: '説明',
      type: 'text'
    }
  ]
};

/*
  Sanity Studioの`sanity.config.js`または`sanity.config.ts`の`schema`定義に、
  上記で作成したスキーマを追加してください。

  例:
  import {defineConfig} from 'sanity'
  import quiz from './schemas/quiz'
  import category from './schemas/category'

  export default defineConfig({
    // ...その他の設定
    schema: {
      types: [
        quiz,
        category
      ]
    }
  })
*/
