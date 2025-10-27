// studio/queries/quizList.js

// クイズ一覧用の GROQ フィルター。
// draft と公開済みの両方を取得しつつ、過去データでフィールドが欠けていても失敗しないようにしています。
export const quizListFilter = '_type == "quiz"';

// 追加パラメータが不要であることを明示するための空オブジェクト。
export const quizListParams = Object.freeze({});

// 公開日時が存在しない古いドキュメントでも降順ソートできるよう、公開日時→更新日時の優先度で並べ替え。
export const quizListDefaultOrdering = Object.freeze([
  {field: 'publishedAt', direction: 'desc'},
  {field: '_updatedAt', direction: 'desc'}
]);

export default {
  filter: quizListFilter,
  params: quizListParams,
  defaultOrdering: quizListDefaultOrdering
};
