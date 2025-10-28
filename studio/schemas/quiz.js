// studio/schemas/quiz.js
import {defineArrayMember, defineField, defineType} from 'sanity'

import {QuizIcon} from '../icons.js'

export default defineType({
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  icon: QuizIcon,

  // グループ設定（タブ切り替え）
  groups: [
    { name: 'content', title: 'コンテンツ', default: true },
    { name: 'publish', title: '公開設定' }
  ],

  orderings: [
    {
      name: 'publishedDesc',
      title: '公開日時 (新しい順)',
      by: [
        { field: 'publishedAt', direction: 'desc' },
        { field: '_updatedAt', direction: 'desc' }
      ]
    },
    {
      name: 'publishedAsc',
      title: '公開日時 (古い順)',
      by: [
        { field: 'publishedAt', direction: 'asc' },
        { field: '_updatedAt', direction: 'asc' }
      ]
    }
  ],

  fields: [
    // ── 公開情報 ─────────────────────────
    defineField({
      name: 'publishedAt',
      title: '公開日時',
      description:
        'サイトに表示される公開日です。未来の日時を指定すると予約公開になります。Studio では日本時間 (Asia/Tokyo) で表示されます。',
      type: 'datetime',
      group: 'publish',
      options: {
        dateFormat: 'YYYY/MM/DD',
        timeFormat: 'HH:mm',
        calendarTodayLabel: '今日',
        timeStep: 1
      },
      validation: (Rule) => Rule.required(),
      initialValue: () => {
        const now = new Date()
        now.setSeconds(0, 0)
        return now.toISOString()
      }
    }),

    // ── 基本情報 ─────────────────────────
    defineField({
      name: 'title',
      title: 'タイトル',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      group: 'content',
      validation: (Rule) => Rule.required()
    }),

    // ── 問題 ─────────────────────────────
    defineField({
      name: 'problemImage',
      title: '問題画像',
      description: '一覧や詳細ページに表示される問題画像です。',
      type: 'image',
      options: { hotspot: true },
      group: 'content',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'problemDescription',
      title: '問題文',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
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
        })
      ]
    }),
    defineField({
      name: 'hints',
      title: 'ヒント（複数可）',
      description: '必要に応じて複数のヒントを追加できます。',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
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
        })
      ]
    }),
    defineField({
      name: 'adCode1',
      title: 'レクタングル広告コード1',
      description: '広告コード等を貼り付ける欄です。空の場合は表示しません。',
      type: 'text',
      group: 'content'
    }),

    // ── 解答 ─────────────────────────────
    defineField({
      name: 'answerImage',
      title: '正解画像',
      type: 'image',
      options: { hotspot: true },
      group: 'content',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'answerExplanation',
      title: '正解への補足テキスト',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
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
        })
      ]
    }),
    defineField({
      name: 'adCode2',
      title: 'レクタングル広告コード2',
      description: '広告コード等を貼り付ける欄です。空の場合は表示しません。',
      type: 'text',
      group: 'content'
    }),
    defineField({
      name: 'closingMessage',
      title: '締め文',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
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
        })
      ]
    }),

    // ── カテゴリ ─────────────────────────
    defineField({
      name: 'category',
      title: 'カテゴリ',
      type: 'reference',
      to: [{ type: 'category' }],
      weak: false,
      group: 'content',
      validation: (Rule) => Rule.required()
    })
  ],

  preview: {
    select: {
      title: 'title',
      media: 'problemImage',
      publishedAt: 'publishedAt',
      slug: 'slug.current'
    },
    prepare({title, media, publishedAt, slug}) {
      const safeTitle =
        typeof title === 'string' && title.trim().length > 0
          ? title
          : '（無題のクイズ）'

      const hasValidMedia = media?.asset?._ref
      const safeMedia = hasValidMedia ? media : undefined

      let dateLabel = '公開日未設定'
      if (publishedAt) {
        const date = new Date(publishedAt)
        if (!Number.isNaN(date.getTime())) {
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          const hh = String(date.getHours()).padStart(2, '0')
          const mm = String(date.getMinutes()).padStart(2, '0')
          dateLabel = `${y}/${m}/${d} ${hh}:${mm}`
        }
      }

      const slugLabel = typeof slug === 'string' && slug ? `/${slug}` : 'スラッグ未設定'
      const subtitle = `${dateLabel}｜${slugLabel}`

      return {
        title: safeTitle,
        subtitle,
        media: safeMedia
      }
    }
  }
})
