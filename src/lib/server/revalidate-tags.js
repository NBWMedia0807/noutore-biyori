// src/lib/server/revalidate-tags.js
// revalidateTag を利用したキャッシュ更新処理をまとめます。

import { revalidateTag } from '@sveltejs/kit';
import { collectQuizTags } from '$lib/cache/tags.js';

export const revalidateQuizTags = ({
  slugs = [],
  categorySlugs = [],
  includeList = true,
  includeSitemap = true
} = {}) => {
  const tags = collectQuizTags({ slugs, categorySlugs, includeList, includeSitemap });
  const results = [];

  for (const tag of tags) {
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
