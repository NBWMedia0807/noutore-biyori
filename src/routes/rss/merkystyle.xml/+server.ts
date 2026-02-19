// src/routes/rss/merkystyle.xml/+server.ts
import type { RequestHandler } from './$types';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { getAbsoluteUrl } from '$lib/rss/getAbsoluteUrl';
import { portableTextToHtml, portableTextToPlain } from '$lib/rss/portableText';
import { resolveImage } from '$lib/rss/images';
import { toRfc822 } from '$lib/rss/toRfc822';
import { resolvePublishedDate } from '$lib/queries/quizVisibility.js';
import { RSS_MERKYSTYLE_QUERY } from '$lib/queries/rssMerkystyle.groq.js';

export const prerender = false;
export const config = { runtime: 'nodejs22.x' };

const CHANNEL = {
  title: '脳トレ日和',
  link: 'https://noutorebiyori.com',
  description:
    '脳トレ日和は、年齢や性別を問わず誰でも楽しめる脳トレサイトです。脳を活性化させるクイズを毎日更新で配信。スマホでサクッと遊べて、楽しく脳を鍛えられます。',
  language: 'ja',
  copyright: '© 2025 脳トレ日和'
};

const sanitizeXmlText = (value: string): string =>
  typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : '';

const escapeXml = (value: string): string =>
  sanitizeXmlText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string): string => escapeXml(value).replace(/`/g, '&#96;');

const renderPortableHtml = (value: unknown): string => portableTextToHtml(value) || '';

const renderParagraph = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return `<p>${escapeXml(trimmed)}</p>`;
};

const toPlainText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  return portableTextToPlain(value);
};

const renderImageHtml = (source: any, alt: string): string => {
  const resolved = resolveImage([source], { minWidth: 640 });
  if (!resolved?.url) return '';
  const safeAlt = resolved.alt || alt;
  return `<p><img src="${escapeAttribute(resolved.url)}" alt="${escapeAttribute(safeAlt)}" /></p>`;
};

const wrapCdata = (value: string): string => {
  const sanitized = sanitizeXmlText(value);
  if (!sanitized) return '<![CDATA[]]>';
  return `<![CDATA[${sanitized.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
};

const compactWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dedupeFragments = (text: string): string[] => {
  const fragments = text
    .split(/(?<=[。！？!?])/u)
    .map((fragment) => compactWhitespace(fragment))
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const fragment of fragments) {
    const key = fragment.replace(/[\s。、,.!?！？]/gu, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(fragment);
  }
  return unique;
};

const buildDescription = (plain: string, fallback: string, extras: string[] = []): string => {
  const candidates = [plain, ...extras, fallback].filter(Boolean);
  const raw = candidates.join(' ').trim();
  if (!raw) return '';
  const normalized = compactWhitespace(raw);
  const fragments = dedupeFragments(normalized);
  const title = fallback ? compactWhitespace(fallback) : '';
  const merged = fragments.length > 0 ? fragments.join(' ') : normalized;
  const withoutTitle = title ? merged.replace(new RegExp(`^${escapeRegExp(title)}\s*`), '') : merged;
  const cleaned = compactWhitespace(withoutTitle || merged);
  const limit = 180;
  if (cleaned.length <= limit) return cleaned;
  const sliced = cleaned.slice(0, limit - 1);
  const trimmed = sliced.replace(/[\s、。,.!?！？]+$/u, '') || sliced;
  return `${trimmed}…`;
};

const pickThumbnail = (doc: any): string | null => {
  if (typeof doc?.thumbnailUrl === 'string' && doc.thumbnailUrl.trim()) {
    return getAbsoluteUrl(doc.thumbnailUrl.trim());
  }
  const resolved = resolveImage([doc?.mainImage, doc?.problemImage, doc?.answerImage], { minWidth: 300 });
  if (!resolved?.url) return null;
  return resolved.url;
};

const pickEnclosure = (doc: any) =>
  resolveImage([doc?.mainImage, doc?.problemImage, doc?.answerImage], { minWidth: 640 });

const buildRelatedLinks = (doc: any) => {
  if (!Array.isArray(doc?.related) || doc.related.length === 0) return [];
  return doc.related
    .map((entry: any) => {
      const slug = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
      const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
      if (!slug || !title) return null;
      const path = `/quiz/${slug}`;
      const link = getAbsoluteUrl(path);
      const thumbnail = pickThumbnail(entry);
      return { title, link, thumbnail };
    })
    .filter(Boolean);
};

const toItem = (doc: any) => {
  const slug = typeof doc?.slug === 'string' ? doc.slug.trim() : '';
  if (!slug) return null;
  const path = `/quiz/${slug}`;
  const link = getAbsoluteUrl(path);
  const title = typeof doc?.title === 'string' ? doc.title : '脳トレ問題';

  const publishedIso = resolvePublishedDate(doc, doc?._id ?? slug) || doc?.publishedAt || doc?._createdAt;
  const updatedIso = doc?._updatedAt || publishedIso;
  const pubDate = toRfc822(publishedIso);
  const modifiedDate = toRfc822(updatedIso);

  const bodyHtml = renderPortableHtml(doc?.body) || renderParagraph(doc?.body);
  const descriptionHtml = renderPortableHtml(doc?.problemDescription) || renderParagraph(doc?.problemDescription);
  const hintsHtml = renderPortableHtml(doc?.hints) || renderParagraph(doc?.hints);
  const answerHtml = renderPortableHtml(doc?.answerExplanation) || renderParagraph(doc?.answerExplanation);
  const closingHtml = renderPortableHtml(doc?.closingMessage) || renderParagraph(doc?.closingMessage);
  const mainImageHtml = renderImageHtml(doc?.mainImage, `${title}のメイン画像`);
  const problemImageHtml = renderImageHtml(doc?.problemImage ?? doc?.questionImage, `${title}の問題画像`);
  const answerImageHtml = renderImageHtml(doc?.answerImage, `${title}の解答画像`);
  const enclosure = pickEnclosure(doc);
  const enclosureHtml = renderImageHtml(enclosure, `${doc?.title ?? '脳トレ問題'}の問題画像`);
  const plain = toPlainText(doc?.body);
  const plainDescription = toPlainText(doc?.problemDescription);
  const plainHints = toPlainText(doc?.hints);
  const plainAnswer = toPlainText(doc?.answerExplanation);
  const plainClosing = toPlainText(doc?.closingMessage);
  const description = buildDescription(plain, title, [plainDescription, plainHints, plainAnswer, plainClosing]);

  const contentParts: string[] = [];
  if (mainImageHtml) {
    contentParts.push(mainImageHtml);
  }
  if (bodyHtml) {
    contentParts.push('<h2>本文</h2>');
    contentParts.push(bodyHtml);
  }
  if (problemImageHtml || descriptionHtml) {
    contentParts.push('<h2>問題</h2>');
    if (problemImageHtml) contentParts.push(problemImageHtml);
    if (descriptionHtml) contentParts.push(descriptionHtml);
  }
  if (hintsHtml) {
    contentParts.push('<h2>ヒント</h2>');
    contentParts.push(hintsHtml);
  }
  if (answerImageHtml || answerHtml) {
    contentParts.push('<h2>解答</h2>');
    if (answerImageHtml) contentParts.push(answerImageHtml);
    if (answerHtml) contentParts.push(answerHtml);
  }
  if (closingHtml) {
    contentParts.push('<h2>締め</h2>');
    contentParts.push(closingHtml);
  }
  if (!contentParts.length && enclosureHtml) {
    contentParts.push(enclosureHtml);
  }

  // 「さらにもう一問」セクション: content:encoded 内にリンク付きHTMLを追加
  const related = buildRelatedLinks(doc);
  if (related.length > 0) {
    contentParts.push('<h3>さらにもう一問！</h3>');
    for (const entry of related) {
      if (entry.thumbnail) {
        contentParts.push(`<p><img src="${escapeAttribute(entry.thumbnail)}" alt="${escapeAttribute(entry.title)}" /></p>`);
      }
      contentParts.push(`<p><a href="${escapeAttribute(entry.link)}">▶ ${escapeXml(entry.title)}</a></p>`);
    }
  }

  const encoded = contentParts.join('') || (description ? `<p>${escapeXml(description)}</p>` : '');
  const thumbnail = pickThumbnail(doc);

  return {
    title,
    link,
    guid: link,
    description,
    encoded,
    pubDate,
    modifiedDate,
    enclosure,
    thumbnail,
    related,
    deleteFlag: '0'
  };
};

const buildItemXml = (item: ReturnType<typeof toItem>) => {
  if (!item) return '';
  const lines = [
    '  <item>',
    `    <title>${escapeXml(item.title)}</title>`,
    `    <link>${escapeXml(item.link)}</link>`,
    `    <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
    '    <category>quiz</category>',
    `    <description>${escapeXml(item.description)}</description>`,
    `    <content:encoded>${wrapCdata(item.encoded)}</content:encoded>`,
    `    <pubDate>${escapeXml(item.pubDate)}</pubDate>`,
    `    <modifiedDate>${escapeXml(item.modifiedDate)}</modifiedDate>`,
    `    <delete>${item.deleteFlag}</delete>`
  ];

  if (item.enclosure?.url) {
    const type = escapeAttribute(pickEnclosureType(item.enclosure.url, item.enclosure.mimeType));
    const url = escapeAttribute(item.enclosure.url);
    lines.push(`    <enclosure url="${url}" type="${type}" length="0" />`);
  }

  if (item.thumbnail) {
    lines.push(`    <media:thumbnail url="${escapeAttribute(item.thumbnail)}" />`);
  }

  if (item.related && item.related.length > 0) {
    for (const related of item.related) {
      const attrs = [`title="${escapeAttribute(related.title)}"`, `link="${escapeAttribute(related.link)}"`];
      if (related.thumbnail) {
        attrs.push(`thumbnail="${escapeAttribute(related.thumbnail)}"`);
      }
      lines.push(`    <relatedlink ${attrs.join(' ')}></relatedlink>`);
    }
  }

  lines.push('  </item>');
  return lines.join('\n');
};

const inferEnclosureTypeFromUrl = (url: string): string => {
  const normalized = url.split('?')[0]?.trim().toLowerCase() ?? '';
  if (normalized.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
};

const pickEnclosureType = (url: string, fallback?: string | null): string => {
  if (fallback && fallback.startsWith('image/')) {
    return fallback;
  }
  if (url) {
    return inferEnclosureTypeFromUrl(url);
  }
  return 'image/jpeg';
};

const buildFeed = (items: any[]) => {
  const now = toRfc822(new Date());
  const itemXml = items.map(buildItemXml).filter(Boolean).join('\n');
  const channelLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">',
    '<channel>',
    `  <title>${escapeXml(CHANNEL.title)}</title>`,
    `  <link>${escapeXml(CHANNEL.link)}</link>`,
    `  <description>${escapeXml(CHANNEL.description)}</description>`,
    `  <language>${escapeXml(CHANNEL.language)}</language>`,
    `  <copyright>${escapeXml(CHANNEL.copyright)}</copyright>`,
    `  <pubDate>${escapeXml(now)}</pubDate>`,
    `  <lastBuildDate>${escapeXml(now)}</lastBuildDate>`
  ];
  if (itemXml) {
    channelLines.push(itemXml);
  }
  channelLines.push('</channel>', '</rss>');
  return channelLines.join('\n');
};

export const GET: RequestHandler = async ({ setHeaders }) => {
  const headers = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' };
  setHeaders(headers);

  if (shouldSkipSanityFetch()) {
    const emptyFeed = buildFeed([]);
    return new Response(emptyFeed, { status: 200 });
  }

  try {
    console.log('[rss] groq >>\n', RSS_MERKYSTYLE_QUERY);
    const docs: any[] = await client.fetch(RSS_MERKYSTYLE_QUERY);
    console.log('[rss] fetched docs:', docs.length);
    const items = Array.isArray(docs) ? docs.map(toItem).filter(Boolean).slice(0, 30) : [];
    console.info('[rss] converted items:', items?.length ?? 0);
    const feed = buildFeed(items);
    return new Response(feed, { status: 200, headers });
  } catch (err: any) {
    console.error('[rss] fetch error:', err?.message, err?.response?.body);
    const fallbackFeed = buildFeed([]);
    return new Response(fallbackFeed, {
      status: 503,
      headers
    });
  }
};
