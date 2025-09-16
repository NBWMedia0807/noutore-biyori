// src/lib/portableText.js
// ポータブルテキストをプレーンテキストとして扱うためのユーティリティ関数群

/**
 * Sanityのポータブルテキスト（block配列）を\n * 改行区切りのプレーンテキストに変換します。
 * @param {unknown} content
 * @returns {string}
 */
export function renderPortableText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content?._type === 'block') return renderPortableText([content]);
  if (Array.isArray(content)) {
    return content
      .filter((block) => block?._type === 'block')
      .map((block) =>
        block?.children
          ?.filter((child) => child?._type === 'span')
          ?.map((child) => child.text)
          .join('') || ''
      )
      .join('\n');
  }
  return '';
}

/**
 * 文字列またはポータブルテキストをプレーンテキストとして返します。
 * @param {unknown} content
 * @returns {string}
 */
export function textOrPortable(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return renderPortableText(content);
}

/**
 * ポータブルテキストのエントリを配列に揃えます。
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function normalizePortableArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
