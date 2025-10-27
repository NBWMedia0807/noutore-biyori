// studio/deskStructure.js
import {CategoryIcon, QuizIcon} from './icons.js'

const PINNED_TYPES = ['quiz', 'category']

const withIcon = (listItem, Icon) => listItem.icon(Icon)

export const deskStructure = (S) => {
  const quizList = withIcon(
    S.listItem().title('クイズ').schemaType('quiz').child(
      S.documentTypeList('quiz').title('クイズ')
    ),
    QuizIcon
  )

  const categoryList = withIcon(
    S.listItem().title('カテゴリ').schemaType('category').child(
      S.documentTypeList('category').title('カテゴリ')
    ),
    CategoryIcon
  )

  const remaining = S.documentTypeListItems().filter(
    (listItem) => !PINNED_TYPES.includes(listItem.getId())
  )

  return S.list()
    .title('コンテンツ')
    .items([quizList, categoryList, S.divider(), ...remaining])
}

export const defaultDocumentNode = (S) =>
  S.document().views([S.view.form().title('編集')])

export default deskStructure
