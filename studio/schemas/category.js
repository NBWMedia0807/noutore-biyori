// studio/schemas/category.js
import {defineField, defineType} from 'sanity'
import {toPlainText} from '../utils/toPlainText.js'

export default defineType({
  name: 'category',
  title: 'カテゴリ',
  type: 'document',
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
    }),

    // ── 公開審査ステータス ─────────────────
    // カテゴリ単位の閉鎖に使う。retracted にすると
    // カテゴリページが 410 Gone を返し、グローバルナビ・メニュー・sitemap からも消える。
    // ※ 所属記事は個別に quiz.reviewStatus を retracted にする必要がある
    //   （retract-categories.py がカテゴリと記事をまとめて更新する）。
    defineField({
      name: 'reviewStatus',
      title: '公開審査ステータス',
      description:
        '「閉鎖」にすると、カテゴリページが 410 Gone を返し、グローバルナビ・メニュー・sitemap から除外されます。カテゴリ文書は削除されないため、「公開可」へ戻せば復帰します。',
      type: 'string',
      options: {
        list: [
          {title: '✅ 公開可', value: 'approved'},
          {title: '🚫 閉鎖（非公開）', value: 'retracted'}
        ],
        layout: 'radio'
      },
      initialValue: 'approved'
    }),
    defineField({
      name: 'retractedReason',
      title: '閉鎖の理由',
      type: 'text',
      rows: 2,
      hidden: ({document}) => document?.reviewStatus !== 'retracted'
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
      const normalizedTitle = safeTitle || '（無題）'
      const normalizedSubtitle = safeSlug ? `/${safeSlug}` : ''

      return {
        title: String(normalizedTitle),
        subtitle: String(normalizedSubtitle)
      }
    }
  }
})
