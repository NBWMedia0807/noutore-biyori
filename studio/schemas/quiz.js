// studio/schemas/quiz.js
import {useEffect} from 'react'
import {set, unset} from 'sanity'

function CategoryReferenceInput(props) {
  const {value, onChange} = props

  useEffect(() => {
    if (Array.isArray(value)) {
      if (value.length > 0 && value[0]) {
        onChange(set(value[0]))
      } else {
        onChange(unset())
      }
    }
  }, [value, onChange])

  return props.renderDefault(props)
}

export default {
  name: 'quiz',
  title: 'クイズ',
  type: 'document',
  fields: [
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
      name: 'mainImage',
      title: '問題画像',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required()
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
codex/fix-react-error-#185-in-quiz-category-field-e476kt
      validation: (Rule) => Rule.required(),
      components: { input: CategoryReferenceInput }

      validation: Rule => Rule.required()
main
    }
  ]
}
