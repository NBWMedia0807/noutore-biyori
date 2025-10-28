// studio/structure/index.js
import {QuizIcon} from '../icons.js'

const quizDefaultOrdering = [
  {field: 'publishedAt', direction: 'desc'},
  {field: '_createdAt', direction: 'desc'}
]

export const deskStructure = (S) =>
  S.list()
    .title('コンテンツ')
    .items([
      S.listItem()
        .id('quiz')
        .title('クイズ')
        .icon(QuizIcon)
        .schemaType('quiz')
        .child(
          S.documentTypeList('quiz')
            .title('クイズ')
            .defaultOrdering(quizDefaultOrdering)
        ),
      S.documentTypeListItem('category').title('カテゴリ')
    ])

export default deskStructure
