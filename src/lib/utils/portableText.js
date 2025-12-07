// src/lib/utils/portableText.js

/**
 * SanityのPortable TextをHTML文字列に変換する強力版ヘルパー
 * どんなデータが来ても、可能な限りテキストを取り出してHTML化します
 */
export function portableTextToHtml(blocks) {
  // 1. データがない場合
  if (!blocks) return '';

  // 2. もしデータが「ただの文字（String）」だった場合
  if (typeof blocks === 'string') {
    return `<p>${blocks}</p>`;
  }

  // 配列でない場合は配列に変換して処理を統一する
  const blockArray = Array.isArray(blocks) ? blocks : [blocks];

  return blockArray.map(block => {
    // データ形式がおかしい、またはテキストを含まない場合はスキップ
    if (!block || typeof block !== 'object') {
      return '';
    }

    // children（テキストの断片）を持っているか確認
    if (block.children && Array.isArray(block.children)) {
      // テキストを結合する
      const text = block.children
        .map(child => child.text || '')
        .join('');
      
      // テキストが空なら何も返さない
      if (!text.trim()) return '';

      // 見出しなどのスタイル適用（SmartNews向けに調整）
      switch (block.style) {
        case 'h1': return `<h3>${text}</h3>`;
        case 'h2': return `<h3>${text}</h3>`;
        case 'h3': return `<h4>${text}</h4>`;
        case 'blockquote': return `<blockquote>${text}</blockquote>`;
        default: return `<p>${text}</p>`; // 基本はpタグ
      }
    }

    return ''; // 読めない形式の場合は無視
  }).join('');
}
