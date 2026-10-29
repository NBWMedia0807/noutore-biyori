// src/lib/rss/pinterestFeed.js
//
// Pinterest 用 RSS 2.0（/feed/pinterest.xml）の XML 組み立てロジック。
// マッチ棒クイズのうち、縦長画像（pinterestImage, 1000×1500）がある問題だけを載せる。
// 画像は scripts/pinterest_image.py が公開後に自動生成して Sanity に保存している。
//
// SvelteKit 固有の import を持たない純粋なモジュールにして、
// tests/pinterest-feed.test.mjs からそのまま検証できるようにしてある。
//
// ── 仕様の要点 ──────────────────────────────────────────────
//   - item ごとに title / link / description / guid / pubDate / enclosure を出す
//   - enclosure は縦長画像そのもの（url / length / type の3属性すべて必須）
//   - link は https://noutorebiyori.com の問題ページ（解答ページではない）
//   - 答えを含む本文（解説・正解画像）は一切出さない

// tests/ から Node で直接読み込まれるため、$lib ではなく相対パスで import する。
import { escapeXml, toRfc822Jst } from './gunosyFeed.js';

export const SITE_NAME = '脳トレ日和';
export const SITE_URL = 'https://noutorebiyori.com';
export const FEED_PATH = '/feed/pinterest.xml';
export const MAX_ITEMS = 50;
export const MATCHSTICK_SLUG_PREFIX = 'matchstick-quiz/';

export const CHANNEL = {
  title: `${SITE_NAME}｜マッチ棒クイズ`,
  link: `${SITE_URL}/`,
  description:
    'マッチ棒を1本だけ動かして正しい式にする「マッチ棒クイズ」を毎日更新。答えは脳トレ日和のサイトで確認できます。',
  language: 'ja',
};

const DESCRIPTION_MAX_LENGTH = 200;

/** 問題ページの URL。マッチ棒クイズのスラッグは "matchstick-quiz/..." */
export const buildProblemUrl = (slug) => `${SITE_URL}/quiz/${String(slug).replace(/^\/+/, '')}`;

const portableToPlain = (value) =>
  Array.isArray(value)
    ? value
        .filter((block) => block?._type === 'block' && Array.isArray(block.children))
        .map((block) => block.children.map((child) => child?.text ?? '').join(''))
        .join('\n')
        .trim()
    : '';

const truncate = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

/** enclosure に使う縦長画像。length / type が揃わないものは Pinterest 側で弾かれるので出さない */
const resolveEnclosure = (image) => {
  const asset = image?.asset;
  const url = typeof asset?.url === 'string' ? asset.url.trim() : '';
  const length = Number(asset?.size);
  if (!url.startsWith('https://') || !Number.isFinite(length) || length <= 0) return null;
  const type =
    typeof asset?.mimeType === 'string' && asset.mimeType.startsWith('image/')
      ? asset.mimeType
      : 'image/jpeg';
  return { url, length: Math.round(length), type };
};

export const toPinterestItem = (doc) => {
  const slug = typeof doc?.slug === 'string' ? doc.slug.trim() : '';
  if (!slug.startsWith(MATCHSTICK_SLUG_PREFIX)) return null;

  const enclosure = resolveEnclosure(doc?.pinterestImage);
  if (!enclosure) return null;

  const title = typeof doc?.title === 'string' && doc.title.trim() ? doc.title.trim() : 'マッチ棒クイズ';
  // 問題文を優先する（seoDescription より答えに触れにくい）
  const description = truncate(
    portableToPlain(doc?.problemDescription) ||
      (typeof doc?.seoDescription === 'string' ? doc.seoDescription.trim() : '') ||
      title,
    DESCRIPTION_MAX_LENGTH
  );
  const link = buildProblemUrl(slug);

  return {
    title,
    link,
    guid: link,
    description,
    pubDate: toRfc822Jst(doc?.publishedAt || doc?._createdAt),
    enclosure,
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

export const buildPinterestFeed = (docs, { now = new Date() } = {}) => {
  const items = (Array.isArray(docs) ? docs : [])
    .map(toPinterestItem)
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
  const builtAt = toRfc822Jst(now);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `  <title>${escapeXml(CHANNEL.title)}</title>`,
    `  <link>${escapeXml(CHANNEL.link)}</link>`,
    `  <description>${escapeXml(CHANNEL.description)}</description>`,
    `  <language>${CHANNEL.language}</language>`,
    `  <lastBuildDate>${escapeXml(builtAt)}</lastBuildDate>`,
    `  <atom:link href="${escapeXml(`${SITE_URL}${FEED_PATH}`)}" rel="self" type="application/rss+xml" />`,
    ...items.map(buildItemXml),
    '</channel>',
    '</rss>',
  ].join('\n');
};
