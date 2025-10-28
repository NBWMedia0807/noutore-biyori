// studio/structure/quizList.js
import {QuizIcon} from '../icons.js';
import {
  quizListDefaultOrdering,
  quizListFilter,
  quizListParams
} from '../queries/quizList.js';

const applyBuilderMethod = (builder, method, value) => {
  if (!builder) return builder;
  const fn = builder?.[method];
  if (typeof fn !== 'function') return builder;
  try {
    return fn.call(builder, value);
  } catch (error) {
    console.error(`Failed to apply method "${method}" on desk builder.`, error);
    return builder;
  }
};

const buildDefaultQuizDocumentList = (S) => {
  if (typeof S?.documentTypeList !== 'function') return null;
  try {
    let list = S.documentTypeList('quiz');
    list = applyBuilderMethod(list, 'id', 'quizListFallback');
    list = applyBuilderMethod(list, 'title', 'クイズ');
    return list;
  } catch (error) {
    console.error('Failed to build fallback quiz document list.', error);
    return null;
  }
};

const createQuizDocumentList = (S) => {
  if (typeof S?.documentList !== 'function') {
    return buildDefaultQuizDocumentList(S);
  }

  try {
    let list = S.documentList();
    list = applyBuilderMethod(list, 'id', 'quizListDocumentList');
    list = applyBuilderMethod(list, 'title', 'クイズ');
    list = applyBuilderMethod(list, 'schemaType', 'quiz');

    if (quizListFilter) {
      list = applyBuilderMethod(list, 'filter', quizListFilter);
    }
    if (quizListParams) {
      list = applyBuilderMethod(list, 'params', quizListParams);
    }
    if (quizListDefaultOrdering?.length) {
      list = applyBuilderMethod(list, 'defaultOrdering', quizListDefaultOrdering);
    }

    return list;
  } catch (error) {
    console.error('Failed to create quiz document list.', error);
    return buildDefaultQuizDocumentList(S);
  }
};

// Desk Structure でクイズドキュメントを安全に表示するためのリスト項目。
// Sanity の標準挙動（ドラフトのハイライト、初期テンプレートなど）を維持するため、
// documentTypeListItem から canHandleIntent を借用しています。
export const buildQuizListItem = (S) => {
  if (!S) return null;

  let baseItem = null;
  try {
    baseItem = typeof S.documentTypeListItem === 'function' ? S.documentTypeListItem('quiz') : null;
  } catch (error) {
    console.error('Failed to obtain base quiz list item.', error);
  }

  if (typeof S.listItem !== 'function') {
    return baseItem ?? buildDefaultQuizDocumentList(S);
  }

  let item = S.listItem();
  item = applyBuilderMethod(item, 'id', 'quizList');
  item = applyBuilderMethod(item, 'title', 'クイズ');
  item = applyBuilderMethod(item, 'icon', QuizIcon);
  item = applyBuilderMethod(item, 'schemaType', 'quiz');
  item = applyBuilderMethod(item, 'child', () => createQuizDocumentList(S));

  const canHandleIntent = baseItem?.getCanHandleIntent?.();
  if (typeof canHandleIntent === 'function') {
    item = applyBuilderMethod(item, 'canHandleIntent', canHandleIntent);
  }

  return item;
};

export default buildQuizListItem;
