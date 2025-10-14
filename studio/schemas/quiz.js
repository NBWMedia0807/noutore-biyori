// studio/schemas/quiz.js
const formatPreviewDate = (value) => {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  } catch (error) {
    console.warn('[studio][quiz] failed to format preview date', value, error);
    return '';
  }
};

export default {
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  fields: [
    // ── 公開情報 ─────────────────────────
    {
      name: 'publishedAt',
      title: '公開日時',
      description:
        '公開開始日時です。未入力の場合は作成日時が公開日に利用されます。未来の日時を指定すると予約公開になり、公開予定として扱われます。スタジオでは日本時間 (Asia/Tokyo) で表示されます。',
      type: 'datetime',
      options: {
        dateFormat: 'YYYY/MM/DD',
        timeFormat: 'HH:mm',
        calendarTodayLabel: '今日',
        timeStep: 1,
        timeZone: 'Asia/Tokyo'
      },
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!value) return true;
          const parsed = Date.parse(value);
          if (Number.isNaN(parsed)) {
            return '有効な日時を入力してください。';
          }
          if (parsed > Date.now()) {
            return Rule.warning('未来日時が設定されています。公開予定として表示されます。');
          }
          return true;
        })
    },
    // ── 基本情報 ─────────────────────────
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
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    },

    // ── 問題 ─────────────────────────────
    {
      name: 'problemImage',
      title: '問題画像',
      description: '一覧や詳細ページに表示される問題画像です。',
      type: 'image',
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
      options: { hotspot: true },
      readOnly: ({ document }) => Boolean(document?.problemImage?.asset?._ref),
      hidden: ({ document }) => Boolean(document?.problemImage?.asset?._ref)
    },
    {
      name: 'problemDescription',
      title: '問題文',
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
      name: 'hints',
      title: 'ヒント（複数可）',
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

    // ── 解答 ─────────────────────────────
    {
      name: 'answerImage',
      title: '正解画像',
      type: 'image',
      options: { hotspot: true },
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

    // ── カテゴリ ─────────────────────────
    {
      name: 'category',
      title: 'カテゴリ',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (Rule) => Rule.required()
    }
  ]
  ,
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
      publishedAt: 'publishedAt',
      createdAt: '_createdAt',
      updatedAt: '_updatedAt'
    },
    prepare(selection) {
      const { title, slug, publishedAt, createdAt, updatedAt } = selection;
      const now = Date.now();
      const effective = publishedAt || createdAt || null;
      const formattedDate = formatPreviewDate(effective);
      const safeTitle = title || slug || 'クイズ';
      const slugPath = slug ? `/${slug}` : '';

      let badgeEmoji = '🟢';
      let badgeLabel = '公開済み';

      const publishedTime = publishedAt ? Date.parse(publishedAt) : Number.NaN;
      if (!Number.isNaN(publishedTime) && publishedTime > now) {
        badgeEmoji = '🟠';
        badgeLabel = '公開予定';
      }

      const subtitleParts = [`${badgeEmoji} ${badgeLabel}`];
      if (formattedDate) {
        subtitleParts.push(`実効: ${formattedDate}`);
      }
      if (updatedAt) {
        const formattedUpdated = formatPreviewDate(updatedAt);
        if (formattedUpdated && formattedUpdated !== formattedDate) {
          subtitleParts.push(`更新: ${formattedUpdated}`);
        }
      }

      return {
        title: safeTitle,
        subtitle: subtitleParts.join(' ｜ '),
        description: slugPath
      };
    }
  }
};
