// studio/schemas/category.js
import React from 'react'
import {defineField, defineType} from 'sanity'

const CategoryIcon = () =>
  React.createElement(
    'span',
    {
      role: 'img',
      'aria-label': 'カテゴリ',
      style: {fontSize: '1.2em', lineHeight: 1}
    },
    '🏷️'
  )

const toPlainText = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

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
    prepare({title, slug}) {
      const safeTitle = toPlainText(title)
      const safeSlug = toPlainText(slug)

      return {
        title: safeTitle || '（無題）',
        subtitle: safeSlug ? `/${safeSlug}` : ''
      }
    }
  }
})
