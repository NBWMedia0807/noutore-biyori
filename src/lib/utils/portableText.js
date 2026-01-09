// src/lib/utils/portableText.js
import { urlFor } from '$lib/sanity/client';

/**
 * SanityのPortable TextをHTML文字列に変換する強力版ヘルパー
 * どんなデータが来ても、可能な限りテキストや画像を取り出してHTML化します
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

  return blockArray
    .map((block) => {
      // データ形式がおかしい場合はスキップ
      if (!block || typeof block !== 'object') {
        return '';
      }

      // --- 画像ブロックの処理 ---
      if (block._type === 'image' && block.asset) {
        try {
          // urlForを使って絶対パスを生成し、シンプルなimgタグを返す
          const imageUrl = urlFor(block).width(800).auto('format').url();
          // altテキストが存在すれば使う、なければ空文字
          const altText = block.alt || '';
          return `<img src="${imageUrl}" alt="${altText}" style="max-width: 100%; height: auto;" />`;
        } catch (e) {
          console.error('Image processing in portableText failed:', e);
          return ''; // エラー時は何も出力しない
        }
      }

      // --- テキストブロックの処理 ---
      if (block.children && Array.isArray(block.children)) {
        // テキストを結合する
        const text = block.children.map((child) => child.text || '').join('');

        // テキストが空なら何も返さない
        if (!text.trim()) return '';

        // 見出しなどのスタイル適用（SmartNews向けに調整）
        switch (block.style) {
          case 'h1':
            return `<h3>${text}</h3>`;
          case 'h2':
            return `<h3>${text}</h3>`;
          case 'h3':
            return `<h4>${text}</h4>`;
          case 'blockquote':
            return `<blockquote>${text}</blockquote>`;
          default:
            return `<p>${text}</p>`; // 基本はpタグ
        }
      }

      return ''; // 読めない形式の場合は無視
    })
    .join('');
}
