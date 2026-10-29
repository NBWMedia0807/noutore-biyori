// src/lib/rss/pinterestFeed.js
// Pinterest 用 RSS 2.0 の組み立て（Sanity・SvelteKit に依存しない純粋関数。テスト用に分離）。
//
// Pinterest は RSS の各 item を1ピンにする。画像は <enclosure> の縦長問題画像
// （答えなし・「答えはサイトで」入り）を使い、ピンのタップ先 <link> を問題ページにする。

export const SITE_URL = 'https://noutorebiyori.com';
export const FEED_PATH = '/feed/pinterest.xml';

const CHANNEL = {
  title: '脳トレ日和 マッチ棒クイズ',
  link: SITE_URL,
  description:
    'マッチ棒を1本だけ動かして正しい式にする脳トレクイズを毎日更新。答えは脳トレ日和のサイトで確認できます。',
  language: 'ja',
};

const DESCRIPTION_SUFFIX = '答えは脳トレ日和のサイトで。';

const sanitizeXml = (v) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : '';

const escapeXml = (v) =>
  sanitizeXml(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toRfc822 = (input) => {
  const d = input instanceof Date ? input : input ? new Date(input) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toUTCString() : '';
};

const portableTextToPlain = (value) =>
  Array.isArray(value)
    ? value
        .filter((b) => b?._type === 'block')
        .map((b) => (b.children || []).map((c) => c?.text || '').join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const buildDescription = (doc, title) => {
  const raw =
    (typeof doc?.seoDescription === 'string' ? doc.seoDescription.trim() : '') ||
    portableTextToPlain(doc?.problemDescription) ||
    title;
  const body = raw.length <= 400 ? raw : `${raw.slice(0, 399)}…`;
  return `${body} ${DESCRIPTION_SUFFIX}`;
};

/**
 * @param {any} doc RSS_PINTEREST_QUERY の1件
 * @param {{ decorateLink?: (url: string) => string }} [options]
 *   decorateLink: <link> に UTM などを付ける（guid は正規URLのまま）
 */
export const toPinterestItem = (doc, { decorateLink = (u) => u, now = new Date() } = {}) => {
  const slug = typeof doc?.slug === 'string' ? doc.slug.trim().replace(/^\/+/, '') : '';
  const image = doc?.pinterestImage;
  if (!slug || typeof image?.url !== 'string' || !image.url) return null;

  // マッチ棒クイズは前日に入稿して翌日0時(JST)公開。公開前の問題がピンになると
  // サイトでは見られない（答えも見られない）ので、公開日時が過ぎたものだけ出す。
  // クエリ側でも絞っているが、ここでも必ず弾く（二重の安全策）。
  const published = new Date(doc?.publishedAt || doc?._createdAt || NaN);
  if (Number.isNaN(published.getTime()) || published.getTime() > now.getTime()) return null;

  const canonicalLink = `${SITE_URL}/quiz/${slug}`;
  const title =
    typeof doc?.title === 'string' && doc.title.trim() ? doc.title.trim() : 'マッチ棒クイズ';
  const size = Number(image.size);

  return {
    title,
    link: decorateLink(canonicalLink),
    guid: canonicalLink,
    description: buildDescription(doc, title),
    pubDate: toRfc822(doc?.publishedAt || doc?._createdAt),
    enclosure: {
      url: image.url,
      length: Number.isFinite(size) && size > 0 ? Math.round(size) : 0,
      type: typeof image.mimeType === 'string' && image.mimeType ? image.mimeType : 'image/png',
    },
  };
};

const buildItemXml = (item) =>
  [
    '  <item>',
    `    <title>${escapeXml(item.title)}</title>`,
    `    <link>${escapeXml(item.link)}</link>`,
    `    <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
    `    <description>${escapeXml(item.description)}</description>`,
    item.pubDate ? `    <pubDate>${escapeXml(item.pubDate)}</pubDate>` : null,
    `    <enclosure url="${escapeXml(item.enclosure.url)}" length="${item.enclosure.length}" type="${escapeXml(item.enclosure.type)}" />`,
    '  </item>',
  ]
    .filter(Boolean)
    .join('\n');

/**
 * @param {any[]} docs
 * @param {{ now?: Date, decorateLink?: (url: string) => string }} [options]
 */
export const buildPinterestFeed = (docs, { now = new Date(), decorateLink } = {}) => {
  const nowRfc = toRfc822(now);
  const items = (Array.isArray(docs) ? docs : [])
    .map((doc) => toPinterestItem(doc, { decorateLink, now }))
    .filter(Boolean)
    .map(buildItemXml);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `  <title>${escapeXml(CHANNEL.title)}</title>`,
    `  <link>${escapeXml(CHANNEL.link)}</link>`,
    `  <description>${escapeXml(CHANNEL.description)}</description>`,
    `  <language>${CHANNEL.language}</language>`,
    `  <lastBuildDate>${escapeXml(nowRfc)}</lastBuildDate>`,
    `  <atom:link href="${escapeXml(`${SITE_URL}${FEED_PATH}`)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '</channel>',
    '</rss>',
  ].join('\n');
};
