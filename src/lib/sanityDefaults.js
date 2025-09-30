// src/lib/sanityDefaults.js
// Sanity 関連の設定値で共通して使うデフォルト値をまとめるヘルパー。
// すべての参照箇所で同じ値を使うことで、プロジェクト ID / dataset の食い違いによる
// data binding エラーを避ける狙い。

export const SANITY_DEFAULTS = {
  projectId: 'quljge22',
  dataset: 'production',
  apiVersion: '2024-01-01'
};

/**
 * 不足している環境変数がある場合に警告を出す小さなユーティリティ。
 * `source` にはログに表示したい識別子（例: 'server', 'public' など）を渡す。
 */
export const warnMissingSanityEnv = ({
  source,
  projectId,
  dataset,
  apiVersion,
  logger = console
}) => {
  if (!logger) return;
  if (!projectId) {
    logger.warn(`[sanity:${source}] projectId が未設定のため、デフォルト値 (${SANITY_DEFAULTS.projectId}) を使用します。`);
  }
  if (!dataset) {
    logger.warn(`[sanity:${source}] dataset が未設定のため、デフォルト値 (${SANITY_DEFAULTS.dataset}) を使用します。`);
  }
  if (!apiVersion) {
    logger.warn(`[sanity:${source}] apiVersion が未設定のため、デフォルト値 (${SANITY_DEFAULTS.apiVersion}) を使用します。`);
  }
};
