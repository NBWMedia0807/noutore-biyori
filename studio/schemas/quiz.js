// studio/schemas/quiz.js
export default {
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  groups: [
    { name: 'content', title: 'コンテンツ', default: true },
    { name: 'publish', title: '公開設定' }
  ],
  fieldsets: [
    {
      name: 'publish',
      title: '公開設定',
      options: { collapsible: true, collapsed: false }
    }
  ],
  orderings: [
    {
      name: 'publishedDesc',
      title: '公開日時 (新しい順)',
      by: [
        { field: 'publishedAt', direction: 'desc' },
        { field: '_createdAt', direction: 'desc' }
      ]
    },
    {
      name: 'publishedAsc',
      title: '公開日時 (古い順)',
      by: [
        { field: 'publishedAt', direction: 'asc' },
        { field: '_createdAt', direction: 'asc' }
      ]
    }
  ],
  fields: [
    // ── 公開情報 ─────────────────────────
    {
      name: 'publishedAt',
      title: '公開日時',
      description:
        'サイトに表示される公開日です。未来の日時を指定すると予約公開になります。Studio では日本時間 (Asia/Tokyo) で表示されます。',
      type: 'datetime',
      group: 'publish',
      fieldset: 'publish',
      options: {
        dateFormat: 'YYYY/MM/DD',
        timeFormat: 'HH:mm',
        calendarTodayLabel: '今日',
        timeStep: 1,
        timeZone: 'Asia/Tokyo'
      },
      validation: (Rule) => Rule.required(),
      initialValue: () => {
        const now = new Date();
        now.setSeconds(0, 0);
        return now.toISOString();
      }
    },
    // ── 基本情報 ─────────────────────────
    {
      name: 'title',
      title: 'タイトル',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    },

    // ── 問題 ─────────────────────────────
    {
      name: 'problemImage',
      title: '問題画像',
      description: '一覧や詳細ページに表示される問題画像です。',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (value?.asset?._ref) return true;
          if (context?.parent?.mainImage?.asset?._ref) {
            return true;
          }
          return '問題画像を設定してください。';
        })
    },
    {
      name: 'mainImage',
      title: '旧：問題画像',
      description: '既存データ互換用のフィールドです。新規では問題画像を利用してください。',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      readOnly: ({ document }) => Boolean(document?.problemImage?.asset?._ref),
      hidden: ({ document }) => Boolean(document?.problemImage?.asset?._ref)
    },
    {
      name: 'problemDescription',
      title: '問題文',
      type: 'array',
      group: 'content',
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
      name: 'hints',
      title: 'ヒント（複数可）',
      description: '必要に応じて複数のヒントを追加できます。',
      type: 'array',
      group: 'content',
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
      type: 'text',
      group: 'content'
    },

    // ── 解答 ─────────────────────────────
    {
      name: 'answerImage',
      title: '正解画像',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      validation: (Rule) => Rule.required()
    },
    {
      name: 'answerExplanation',
      title: '正解への補足テキスト',
      type: 'array',
      group: 'content',
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
      type: 'text',
      group: 'content'
    },
    {
      name: 'closingMessage',
      title: '締め文',
      type: 'array',
      group: 'content',
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

    // ── カテゴリ ─────────────────────────
    {
      name: 'category',
      title: 'カテゴリ',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'content',
      validation: (Rule) => Rule.required()
    }
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
      publishedAt: 'publishedAt',
      media: 'problemImage'
    },
    prepare({ title, slug, publishedAt, media }) {
      const safeTitle = title || '無題のクイズ';
      const slugLabel = slug ? `/${slug}` : 'スラッグ未設定';

      let publishLabel = '公開日未設定';
      if (publishedAt) {
        const date = new Date(publishedAt);
        if (!Number.isNaN(date.getTime())) {
          const year = String(date.getFullYear());
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          publishLabel = `公開: ${year}/${month}/${day} ${hours}:${minutes}`;
        }
      }

      const subtitle = `${slugLabel}｜${publishLabel}`;

      return {
        title: safeTitle,
        subtitle,
        media
      };
    }
  }
}
