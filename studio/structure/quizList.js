// studio/structure/quizList.js
import {QuizIcon} from '../icons.js';
import {
  quizListDefaultOrdering,
  quizListFilter,
  quizListParams
} from '../queries/quizList.js';

// Desk Structure でクイズドキュメントを安全に表示するためのリスト項目。
// Sanity の標準挙動（ドラフトのハイライト、初期テンプレートなど）を維持するため、
// documentTypeListItem から canHandleIntent を借用しています。
export const buildQuizListItem = (S) => {
  const baseItem = S.documentTypeListItem('quiz');

  return S.listItem()
    .id('quizList')
    .title('クイズ')
    .icon(QuizIcon)
    .schemaType('quiz')
    .child(() =>
      S.documentList()
        .id('quizListDocumentList')
        .title('クイズ')
        .schemaType('quiz')
        .filter(quizListFilter)
        .params(quizListParams)
        .defaultOrdering(quizListDefaultOrdering)
    )
    .canHandleIntent(baseItem.getCanHandleIntent());
};

export default buildQuizListItem;
