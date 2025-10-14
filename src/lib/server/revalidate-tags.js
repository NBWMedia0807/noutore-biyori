// src/lib/server/revalidate-tags.js
// revalidateTag を利用したキャッシュ更新処理をまとめます。

import { collectQuizTags } from '$lib/cache/tags.js';

let cachedRevalidateTag;
let attemptedImport = false;

const loadRevalidateTag = async () => {
  if (attemptedImport) {
    return cachedRevalidateTag;
  }

  attemptedImport = true;

  try {
    const kit = await import('@sveltejs/kit');
    if (typeof kit.revalidateTag === 'function') {
      cachedRevalidateTag = kit.revalidateTag;
    } else {
      console.warn('[revalidate] 現在の SvelteKit には revalidateTag が含まれていません。');
      cachedRevalidateTag = null;
    }
  } catch (error) {
    console.warn('[revalidate] revalidateTag の読み込みに失敗したためスキップします。', error);
    cachedRevalidateTag = null;
  }

  return cachedRevalidateTag;
};

export const revalidateQuizTags = async ({
  slugs = [],
  categorySlugs = [],
  includeList = true,
  includeSitemap = true
} = {}) => {
  const tags = collectQuizTags({ slugs, categorySlugs, includeList, includeSitemap });
  const results = [];
  const revalidateTag = await loadRevalidateTag();

  for (const tag of tags) {
    if (typeof revalidateTag !== 'function') {
      results.push({ tag, ok: false, skipped: true, error: 'revalidateTag unavailable' });
      continue;
    }

    try {
      revalidateTag(tag);
      results.push({ tag, ok: true });
    } catch (error) {
      console.error(`[revalidate] Failed to revalidate tag: ${tag}`, error);
      results.push({ tag, ok: false, error: error?.message || String(error) });
    }
  }

  return { tags, results };
};
