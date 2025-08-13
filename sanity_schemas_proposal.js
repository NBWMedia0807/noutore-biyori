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
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'mainImage',
      title: '問題画像',
      type: 'image',
      options: {
        hotspot: true
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'problemDescription',
      title: '問題の補足',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [],
          marks: {
            decorators: [{title: 'Strong', value: 'strong'}, {title: 'Emphasis', value: 'em'}],
            annotations: []
          }
        }
      ]
    },
    {
      name: 'adCode1',
      title: 'レクタングル広告コード1',
      type: 'text',
      description: 'AdSenseなどの広告コードをここに貼り付けます。'
    },
    {
      name: 'answerImage',
      title: '正解画像',
      type: 'image',
      options: {
        hotspot: true
      },
      description: '2ページ目に表示される正解画像です。'
    },
    {
      name: 'adCode2',
      title: 'レクタングル広告コード2',
      type: 'text',
      description: 'AdSenseなどの広告コードをここに貼り付けます。空白の場合は表示されません。'
    },
    {
      name: 'answerExplanation',
      title: '正解への補足テキスト',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [],
          marks: {
            decorators: [{title: 'Strong', value: 'strong'}, {title: 'Emphasis', value: 'em'}],
            annotations: []
          }
        }
      ]
    },
    {
      name: 'category',
      title: 'カテゴリ',
      type: 'reference',
      to: [{type: 'category'}],
      validation: Rule => Rule.required()
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
      validation: Rule => Rule.required()
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
  import {schemaTypes} from './schemas'
  import quiz from './schemas/quiz'
  import category from './schemas/category'

  export default defineConfig({
    // ...その他の設定
    schema: {
      types: schemaTypes.concat([
        quiz,
        category
      ]),
    },
  })
*/


