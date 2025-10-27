// studio/schemas/category.js
import {defineField, defineType} from 'sanity'

import {CategoryIcon} from '../icons.js'
import {toPlainText} from '../utils/toPlainText.js'

export default defineType({
  name: 'category',
  title: 'カテゴリ',
  type: 'document',
  icon: CategoryIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'タイトル',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'description',
      title: '説明',
      type: 'text'
    })
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current'
    },
    prepare({ title, slug }) {
      const safeTitle = toPlainText(title)
      const safeSlug = toPlainText(slug)
      return {
        title: safeTitle || '（無題）',
        subtitle: safeSlug ? `/${safeSlug}` : ''
      }
    }
  }
})
