// studio/structure/index.js
import buildQuizListItem from './quizList.js';

const deskStructure = (S) =>
  S.list()
    .id('root')
    .title('コンテンツ')
    .items([
      buildQuizListItem(S),
      S.documentTypeListItem('category').id('categoryList').title('カテゴリ')
    ]);

export default deskStructure;
