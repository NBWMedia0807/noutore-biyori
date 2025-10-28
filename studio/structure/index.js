// studio/structure/index.js

const quizDefaultOrdering = [
  {field: 'publishedAt', direction: 'desc'},
  {field: '_createdAt', direction: 'desc'}
]

export const deskStructure = (S) =>
  S.list()
    .id('desk-root')
    .title('コンテンツ')
    .items([
      S.listItem()
        .id('quiz-section')
        .title('クイズ')
        .child(
          S.documentList()
            .id('quiz-document-list')
            .title('クイズ')
            .schemaType('quiz')
            .filter('_type == $type')
            .params({type: 'quiz'})
            .defaultOrdering(quizDefaultOrdering)
        ),
      S.documentTypeListItem('category')
        .id('category-document-list')
        .title('カテゴリ')
    ])

export default deskStructure
