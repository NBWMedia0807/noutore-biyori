// studio/deskStructure.js
const deskStructure = (S) =>
  S.list()
    .id('root')
    .title('コンテンツ')
    .items([
      S.documentTypeListItem('quiz').id('quizList').title('クイズ'),
      S.documentTypeListItem('category').id('categoryList').title('カテゴリ')
    ])

export default deskStructure
