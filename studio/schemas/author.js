// studio/schemas/author.js
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'author',
  title: '著者',
  type: 'document',

  groups: [
    {name: 'profile', title: 'プロフィール', default: true},
    {name: 'seo', title: 'SEO / 外部リンク'}
  ],

  fields: [
    defineField({
      name: 'name',
      title: '著者名',
      type: 'string',
      group: 'profile',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ（URL）',
      description: '/author/[slug] のURL部分です。英数字・ハイフンのみ使用してください。',
      type: 'slug',
      options: {source: 'name', maxLength: 64},
      group: 'profile',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'photo',
      title: 'プロフィール写真',
      type: 'image',
      options: {hotspot: true},
      group: 'profile'
    }),
    defineField({
      name: 'jobTitle',
      title: '専門分野・肩書き',
      description: '例: 認知症予防アドバイザー / 脳トレ日和 編集長',
      type: 'string',
      group: 'profile'
    }),
    defineField({
      name: 'bio',
      title: 'プロフィール文',
      description: '著者紹介ページに表示されます。200〜400文字が目安です。',
      type: 'text',
      rows: 6,
      group: 'profile'
    }),
    defineField({
      name: 'career',
      title: '経歴',
      description: '資格・職歴・学歴など E-E-A-T 強化につながる情報を記載してください。',
      type: 'text',
      rows: 4,
      group: 'profile'
    }),
    defineField({
      name: 'sameAs',
      title: 'SNS / 外部プロフィールURL',
      description:
        'JSON-LD の Person スキーマ sameAs に出力されます。X (Twitter)・LinkedIn・公式サイトなど。',
      type: 'array',
      group: 'seo',
      of: [{type: 'url'}],
      validation: (Rule) => Rule.max(10)
    })
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'jobTitle',
      media: 'photo'
    },
    prepare({title, subtitle, media}) {
      return {
        title: title || '（著者名未設定）',
        subtitle: subtitle || '',
        media
      }
    }
  }
})
