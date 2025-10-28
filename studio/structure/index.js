// studio/structure/index.js
import buildQuizListItem from './quizList.js';

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

const buildCategoryListItem = (S) => {
  if (typeof S?.documentTypeListItem !== 'function') return null;

  try {
    let item = S.documentTypeListItem('category');
    item = applyBuilderMethod(item, 'id', 'categoryList');
    item = applyBuilderMethod(item, 'title', 'カテゴリ');
    return item;
  } catch (error) {
    console.error('Failed to build category list item.', error);
    return null;
  }
};

const buildDefaultRootList = (S) => {
  if (typeof S?.list !== 'function') return null;

  try {
    let list = S.list();
    list = applyBuilderMethod(list, 'id', 'safeRoot');
    list = applyBuilderMethod(list, 'title', 'コンテンツ');

    const defaultItems =
      typeof S.documentTypeListItems === 'function'
        ? S.documentTypeListItems().filter(Boolean)
        : [];
    list = applyBuilderMethod(list, 'items', defaultItems);

    return list;
  } catch (error) {
    console.error('Failed to build fallback root list.', error);
    return null;
  }
};

export const deskStructure = (S, context) => {
  if (!S) return null;

  try {
    let list = typeof S.list === 'function' ? S.list() : null;
    if (!list) return buildDefaultRootList(S);

    list = applyBuilderMethod(list, 'id', 'root');
    list = applyBuilderMethod(list, 'title', 'コンテンツ');

    const items = [buildQuizListItem(S, context), buildCategoryListItem(S)].filter(Boolean);
    list = applyBuilderMethod(list, 'items', items);

    return list;
  } catch (error) {
    console.error('Failed to build desk structure.', error);
    return buildDefaultRootList(S);
  }
};

export const safeStructure = (S, context) => {
  try {
    const structure = deskStructure?.(S, context);
    if (structure) return structure;
  } catch (error) {
    console.error('Desk structure crashed. Falling back to defaults.', error);
  }

  const fallback = buildDefaultRootList(S);
  if (fallback) return fallback;

  if (typeof S?.documentList === 'function') {
    try {
      let list = S.documentList();
      list = applyBuilderMethod(list, 'id', 'safeAllDocuments');
      list = applyBuilderMethod(list, 'title', 'すべてのドキュメント');
      return list;
    } catch (error) {
      console.error('Failed to build document list fallback.', error);
    }
  }

  return S?.list?.() ?? null;
};

export default deskStructure;
