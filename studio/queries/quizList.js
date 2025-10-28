// studio/queries/quizList.js

// クイズ一覧用の GROQ フィルター。
// draft を除外しつつ、公開済みと過去データの両方を安全に取得します。
export const quizListFilter =
  '(_type == "quiz") && !(_id in path("drafts.**"))';

// 追加パラメータが不要であることを明示するための空オブジェクト。
export const quizListParams = Object.freeze({});

// 公開日時が存在しない古いドキュメントでも降順ソートできるよう、
// 公開日時→作成日時の優先度で並べ替え。
export const quizListDefaultOrdering = Object.freeze([
  {field: 'publishedAt', direction: 'desc'},
  {field: '_createdAt', direction: 'desc'}
]);

export default {
  filter: quizListFilter,
  params: quizListParams,
  defaultOrdering: quizListDefaultOrdering
};
