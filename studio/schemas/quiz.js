// studio/schemas/quiz.js
import {defineArrayMember, defineField, defineType} from 'sanity'

export default defineType({
  name: 'quiz',
  title: 'クイズ',
  type: 'document',

  // グループ設定（タブ切り替え）
  groups: [
    { name: 'content', title: 'コンテンツ', default: true },
    { name: 'publish', title: '公開設定' },
    { name: 'seo', title: 'SEO設定' }
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
      title: '公開日',
      description:
        'サイトに表示される公開日です。日付だけを入力してください。Studio では日本時間 (Asia/Tokyo) で表示されます。',
      type: 'date',
      group: 'publish',
      options: {
        dateFormat: 'YYYY/MM/DD',
        calendarTodayLabel: '今日'
      },
      validation: (Rule) => Rule.required(),
      initialValue: () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    }),

    // ── 基本情報 ─────────────────────────
    defineField({
      name: 'title',
      title: 'タイトル',
      type: 'string',
      group: 'content',
      // 配列で返すことで required(エラー) と clickbait検出(警告) を独立させる
      validation: (Rule) => [
        Rule.required(),
        Rule.custom((value) => {
          if (typeof value !== 'string') return true
          const CLICKBAIT_WORDS = ['衝撃', '判明', '信じられない', 'まさか', '驚愕', '緊急', 'やばい']
          const found = CLICKBAIT_WORDS.filter((w) => value.includes(w))
          if (found.length > 0) {
            return `このタイトルは Google Discover で降格される可能性があります（検出ワード: ${found.join('、')}）。内容に即した具体的なタイトルを推奨します。`
          }
          return true
        }).warning()
      ]
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      group: 'content',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'mainImage',
      title: 'メイン画像',
      description: '記事全体で利用する代表画像です。問題画像が自動的に使用されます。',
      type: 'image',
      options: { hotspot: true },
      group: 'content',
      readOnly: true,
      hidden: true
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
      name: 'questionImage',
      title: '旧: 問題画像 (参照用)',
      description:
        '旧バージョンで登録された問題画像です。問題画像が未設定の場合はこちらを参照できます。再設定後は空欄のままで問題ありません。',
      type: 'image',
      options: { hotspot: true },
      group: 'content',
      readOnly: true,
      hidden: ({ document }) => {
        const ref = document?.questionImage?.asset?._ref
        return !(typeof ref === 'string' && ref.length > 0)
      }
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

    // ── SEO設定 ──────────────────────────
    defineField({
      name: 'seoTitle',
      title: 'SEOタイトル',
      description:
        '検索結果に表示されるタイトルです。空白の場合はクイズタイトルが使用されます。目安: 30〜60文字。',
      type: 'string',
      group: 'seo',
      // 配列で返すことで max文字数(警告) と clickbait検出(警告) を独立させる
      validation: (Rule) => [
        Rule.max(60).warning('SEOタイトルは60文字以内を推奨します。'),
        Rule.custom((value) => {
          if (typeof value !== 'string' || !value) return true
          const CLICKBAIT_WORDS = ['衝撃', '判明', '信じられない', 'まさか', '驚愕', '緊急', 'やばい']
          const found = CLICKBAIT_WORDS.filter((w) => value.includes(w))
          if (found.length > 0) {
            return `Google Discover で降格される可能性があります（検出ワード: ${found.join('、')}）。`
          }
          return true
        }).warning()
      ]
    }),
    defineField({
      name: 'seoDescription',
      title: 'メタディスクリプション',
      description:
        '検索結果に表示される説明文です。空白の場合は問題文から自動生成されます。目安: 70〜120文字。',
      type: 'text',
      rows: 3,
      group: 'seo',
      validation: (Rule) =>
        Rule.max(160).warning('メタディスクリプションは160文字以内を推奨します。')
    }),
    defineField({
      name: 'ogImage',
      title: 'OGP画像',
      description:
        'SNSシェア時に表示されるサムネイル画像です。⚠️ 1200×630px（1.91:1）の画像を使用してください。比率がズレると Discover カードの上下が切れて CTR が低下します。空白の場合は問題画像が自動使用されます。',
      type: 'image',
      options: { hotspot: true },
      group: 'seo',
      validation: (Rule) =>
        Rule.custom((image) => {
          if (!image?.asset?._ref) return true
          return 'OGP画像は 1200×630px（1.91:1）を推奨します。アップロード前にサイズを確認してください。'
        }).warning()
    }),
    defineField({
      name: 'imageType',
      title: '画像種別',
      description:
        'Google Discover での CTR に直結します。ストック写真はオリジナル画像より大幅に CTR が低下します。',
      type: 'string',
      group: 'seo',
      options: {
        list: [
          { title: '✅ オリジナル画像', value: 'original' },
          { title: '⚠️ ストック写真', value: 'stock' },
          { title: 'イラスト・図解', value: 'illustration' }
        ],
        layout: 'radio'
      },
      initialValue: 'original',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (value === 'stock') {
            return 'ストック写真は Discover の CTR が著しく低下します。オリジナル画像への変更を強く推奨します。'
          }
          return true
        }).warning()
    }),
    defineField({
      name: 'relatedArticles',
      title: '関連記事',
      description:
        'JSON-LD の relatedLink に出力されます。同カテゴリの関連クイズを 3〜5 件選択してください。',
      type: 'array',
      group: 'seo',
      of: [
        {
          type: 'reference',
          to: [{ type: 'quiz' }],
          options: { disableNew: true }
        }
      ],
      validation: (Rule) => Rule.max(10).warning('関連記事は10件以内を推奨します。')
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
    }),

    // ── 著者 ─────────────────────────
    defineField({
      name: 'author',
      title: '著者',
      description: '記事の著者を選択してください。E-E-A-T 向上のため設定を推奨します。',
      type: 'reference',
      to: [{ type: 'author' }],
      weak: false,
      group: 'content'
    })
  ],

  preview: {
    select: {
      title: 'title',
      media: 'problemImage',
      fallbackMedia: 'questionImage',
      publishedAt: 'publishedAt',
      slug: 'slug.current'
    },
    prepare({title, media, fallbackMedia, publishedAt, slug}) {
      const safeTitle =
        typeof title === 'string' && title.trim().length > 0
          ? title
          : '（無題のクイズ）'

      const primaryMedia = media?.asset?._ref ? media : undefined
      const legacyMedia = fallbackMedia?.asset?._ref ? fallbackMedia : undefined
      const safeMedia = primaryMedia ?? legacyMedia

      let dateLabel = '公開日未設定'
      if (publishedAt) {
        const date = new Date(publishedAt)
        if (!Number.isNaN(date.getTime())) {
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          dateLabel = `${y}/${m}/${d}`
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
