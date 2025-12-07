// src/lib/utils/portableText.js

// SanityのPortable TextをHTML文字列に変換する簡易ヘルパー
export function portableTextToHtml(blocks) {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }

  return blocks.map(block => {
    if (block._type !== 'block' || !block.children) {
      return '';
    }

    // テキスト要素を結合
    const text = block.children.map(child => {
      // リンクなどの装飾がある場合はここで処理（今回は簡易的にテキストのみ）
      return child.text || '';
    }).join('');

    // スタイルに応じたタグで囲む
    switch (block.style) {
      case 'h1': return `<h1>${text}</h1>`;
      case 'h2': return `<h2>${text}</h2>`;
      case 'h3': return `<h3>${text}</h3>`;
      case 'h4': return `<h4>${text}</h4>`;
      case 'blockquote': return `<blockquote>${text}</blockquote>`;
      default: return `<p>${text}</p>`;
    }
  }).join('');
}
