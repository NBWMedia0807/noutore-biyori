// studio/deskStructure.js
import {CategoryIcon, QuizIcon} from './icons.js'

const PINNED_TYPES = ['quiz', 'category']

const withIcon = (listItem, Icon) => listItem.icon(Icon)

export const deskStructure = (S) => {
  const quizList = withIcon(
    S.documentTypeListItem('quiz').id('quizList').title('クイズ'),
    QuizIcon
  )

  const categoryList = withIcon(
    S.documentTypeListItem('category').id('categoryList').title('カテゴリ'),
    CategoryIcon
  )

  const remaining = S.documentTypeListItems().filter(
    (listItem) => !PINNED_TYPES.includes(listItem.getId())
  )

  return S.list()
    .id('root')
    .title('コンテンツ')
    .items([quizList, categoryList, S.divider(), ...remaining])
}

export const defaultDocumentNode = (S) =>
  S.document().views([S.view.form().title('編集')])

export default deskStructure
