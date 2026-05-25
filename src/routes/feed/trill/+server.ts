// src/routes/feed/trill/+server.ts
import type { RequestHandler } from './$types';
import { client, shouldSkipSanityFetch } from '$lib/sanity.server.js';
import { getAbsoluteUrl } from '$lib/rss/getAbsoluteUrl';
import { buildImageUrl } from '$lib/rss/images';
import { toRfc822 } from '$lib/rss/toRfc822';
import { portableTextToPlain } from '$lib/rss/portableText';
import { resolvePublishedDate } from '$lib/queries/quizVisibility.js';
import { RSS_TRILL_QUERY } from '$lib/queries/rssTrill.groq.js';

const SITE_NAME = '脳トレ日和'; // 脳トレ日和
const SITE_URL = 'https://noutorebiyori.com';
const FEED_PATH = '/feed/trill';

const CHANNEL = {
	title: SITE_NAME,
	link: SITE_URL,
	description:
		'脳トレ日和は、年齢や性別を問わず誰でも楽しめる脳トレサイトです。脳を活性化させるクイズを毎日更新で配信。スマホでサクッと調べて、楽しく脳を鍛えられます。',
	language: 'ja'
};

// ---- XML utilities ----

// Strip XML-illegal control characters
const sanitizeXml = (v: string): string =>
	typeof v === 'string'
		? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		: '';

const escapeXml = (v: string): string =>
	sanitizeXml(v)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const escapeAttr = (v: string): string => escapeXml(v).replace(/`/g, '&#96;');

const wrapCdata = (v: string): string => {
	const s = sanitizeXml(v);
	if (!s) return '<![CDATA[]]>';
	return `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
};

// RFC4287 (ISO 8601) format for atom:updated
const toRfc4287 = (input: unknown): string => {
	const d =
		input instanceof Date
			? input
			: typeof input === 'string' && input.trim()
				? new Date(input)
				: null;
	return d && !Number.isNaN(d.getTime()) ? d.toISOString() : '';
};

// ---- TRILL-specific image renderer ----
// Outputs <figure> with numeric width/height and <figcaption> as required by TRILL.
// Images must NOT be wrapped in <a> tags (TRILL spec).

const renderTrillFigure = (source: any, alt: string): string => {
	if (!source) return '';
	const url = buildImageUrl(source, { width: 1200 });
	if (!url) return '';
	const origW: number = source?.asset?.metadata?.dimensions?.width ?? 0;
	const origH: number = source?.asset?.metadata?.dimensions?.height ?? 0;
	const displayW = origW > 0 ? Math.min(origW, 1200) : 1200;
	const displayH = origW > 0 && origH > 0 ? Math.round((origH * displayW) / origW) : 675;
	const safeAlt = (typeof source?.alt === 'string' ? source.alt.trim() : '') || alt;
	return (
		`<figure>` +
		`<img src="${escapeAttr(url)}" alt="${escapeAttr(safeAlt)}" width="${displayW}" height="${displayH}">` +
		`<figcaption>${escapeXml(SITE_NAME)}</figcaption>` +
		`</figure>`
	);
};

// ---- TRILL-specific portable text renderer ----
// Key differences from the shared renderer:
//   - Lists => <ul>/<ol> with <li> instead of <p> with bullet prefixes
//   - Image blocks => <figure> with width/height/figcaption (no <p> wrapper)
//   - strong/em marks properly applied

type PTChild = { _type?: string; text?: string; marks?: string[] };
type PTMarkDef = { _key?: string; _type?: string; href?: string; url?: string };
type PTBlock = {
	_type?: string;
	style?: string;
	children?: PTChild[];
	markDefs?: PTMarkDef[];
	listItem?: string;
	alt?: string;
	asset?: { url?: string };
	url?: string;
	embedUrl?: string;
	videoId?: string;
};

const escHtml = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const renderChild = (child: PTChild, markDefs: PTMarkDef[]): string => {
	if (!child) return '';
	if (child._type === 'break') return '<br>';
	const raw = typeof child.text === 'string' ? child.text : '';
	if (!raw) return '';
	let text = escHtml(raw).replace(/\r?\n/g, '<br>');
	if (!Array.isArray(child.marks) || child.marks.length === 0) return text;
	for (const mark of child.marks) {
		if (!mark) continue;
		if (mark === 'strong') {
			text = `<strong>${text}</strong>`;
			continue;
		}
		if (mark === 'em') {
			text = `<em>${text}</em>`;
			continue;
		}
		const def = markDefs.find((d) => d._key === mark);
		if (!def) continue;
		if (def._type === 'link' || def.href || def.url) {
			const href = (def.href || def.url || '').trim();
			if (href) text = `<a href="${escapeAttr(getAbsoluteUrl(href))}">${text}</a>`;
		}
	}
	return text;
};

const renderChildren = (block: PTBlock): string =>
	(block.children || []).map((c) => renderChild(c, block.markDefs || [])).join('');

const extractYoutubeId = (block: PTBlock): string | null => {
	if (typeof block.videoId === 'string' && block.videoId.trim()) return block.videoId.trim();
	const url = block.url || block.embedUrl || '';
	for (const re of [
		/youtu\.be\/([a-zA-Z0-9_-]{6,})/,
		/v=([a-zA-Z0-9_-]{6,})/,
		/embed\/([a-zA-Z0-9_-]{6,})/
	]) {
		const m = url.match(re);
		if (m?.[1]) return m[1];
	}
	return null;
};

const portableToTrillHtml = (value: unknown): string => {
	if (!Array.isArray(value)) return '';
	const parts: string[] = [];
	let listBuf: string[] = [];
	let listType: 'bullet' | 'number' | null = null;

	const flushList = () => {
		if (!listType || listBuf.length === 0) return;
		const tag = listType === 'number' ? 'ol' : 'ul';
		parts.push(`<${tag}>${listBuf.map((item) => `<li>${item}</li>`).join('')}</${tag}>`);
		listBuf = [];
		listType = null;
	};

	for (const block of value as PTBlock[]) {
		if (!block) continue;

		if (block.listItem === 'bullet' || block.listItem === 'number') {
			const content = renderChildren(block).trim();
			if (!content) continue;
			const type = block.listItem === 'number' ? 'number' : 'bullet';
			if (listType && type !== listType) flushList();
			listType = type;
			listBuf.push(content);
			continue;
		}

		flushList();

		if (block._type === 'block') {
			const content = renderChildren(block).trim();
			if (!content) continue;
			const style = block.style || 'normal';
			if (style === 'h2') {
				parts.push(`<h2>${content}</h2>`);
				continue;
			}
			if (style === 'h3') {
				parts.push(`<h3>${content}</h3>`);
				continue;
			}
			if (style === 'h4') {
				parts.push(`<h4>${content}</h4>`);
				continue;
			}
			parts.push(`<p>${content}</p>`);
			continue;
		}

		if (block._type === 'image') {
			const url = buildImageUrl(block, { width: 1200 });
			if (!url) continue;
			const alt = typeof block.alt === 'string' ? block.alt : '';
			// Dimensions not available in portable text image blocks; use safe defaults
			parts.push(
				`<figure>` +
					`<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" width="1200" height="675">` +
					`<figcaption>${escapeXml(SITE_NAME)}</figcaption>` +
					`</figure>`
			);
			continue;
		}

		if (block._type === 'youtube' || block._type === 'video' || block._type === 'videoEmbed') {
			const videoId = extractYoutubeId(block);
			if (!videoId) continue;
			parts.push(
				`<iframe src="${escapeAttr(`https://www.youtube.com/embed/${videoId}`)}"></iframe>`
			);
			continue;
		}
	}

	flushList();
	return parts.join('');
};

// ---- Feed item builder ----

const buildContentHtml = (doc: any): string => {
	const parts: string[] = [];
	const title = typeof doc?.title === 'string' ? doc.title : '';

	const problemFigure = renderTrillFigure(doc?.problemImage, `${title}の問題画像`);
	const problemHtml = portableToTrillHtml(doc?.problemDescription);
	if (problemFigure || problemHtml) {
		parts.push('<h2>問題</h2>');
		if (problemFigure) parts.push(problemFigure);
		if (problemHtml) parts.push(problemHtml);
	}

	const hintsHtml = portableToTrillHtml(doc?.hints);
	if (hintsHtml) {
		parts.push('<h2>ヒント</h2>');
		parts.push(hintsHtml);
	}

	const answerFigure = renderTrillFigure(doc?.answerImage, `${title}の解答画像`);
	const answerHtml = portableToTrillHtml(doc?.answerExplanation);
	const closingHtml = portableToTrillHtml(doc?.closingMessage);
	if (answerFigure || answerHtml || closingHtml) {
		parts.push('<h2>解答</h2>');
		if (answerFigure) parts.push(answerFigure);
		if (answerHtml) parts.push(answerHtml);
		if (closingHtml) parts.push(closingHtml);
	}

	// 「さらにもう一問！」セクション
	// TRILL仕様: 画像は <figure> で独立、リンクは <p><a>、画像を <a> で囲まない
	const related: any[] = Array.isArray(doc?.related) ? doc.related : [];
	if (related.length > 0) {
		parts.push('<h3>さらにもう一問！</h3>');
		for (const entry of related) {
			const slug = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
			const entryTitle = typeof entry?.title === 'string' ? entry.title.trim() : '';
			if (!slug || !entryTitle) continue;
			const link = getAbsoluteUrl(`/quiz/${slug}`);
			const figure = renderTrillFigure(entry?.image, entryTitle);
			if (figure) parts.push(figure);
			parts.push(`<p><a href="${escapeAttr(link)}">▶ ${escapeXml(entryTitle)}</a></p>`);
		}
	}

	return parts.join('');
};

const buildDescription = (doc: any, title: string): string => {
	const raw =
		(typeof doc?.seoDescription === 'string' ? doc.seoDescription.trim() : '') ||
		portableTextToPlain(doc?.problemDescription).slice(0, 180);
	if (!raw) return title;
	return raw.length <= 180 ? raw : `${raw.slice(0, 179)}…`;
};

const toItem = (doc: any) => {
	const slug = typeof doc?.slug === 'string' ? doc.slug.trim() : '';
	if (!slug) return null;

	const link = getAbsoluteUrl(`/quiz/${slug}`);
	const title = typeof doc?.title === 'string' ? doc.title.trim() : '脳トレ問題';

	const publishedIso =
		resolvePublishedDate(doc, doc?._id ?? slug) || doc?.publishedAt || doc?._createdAt;
	const updatedIso = doc?._updatedAt || publishedIso;

	const pubDate = toRfc822(publishedIso);
	const atomUpdated = toRfc4287(updatedIso);

	const description = buildDescription(doc, title);
	const contentHtml = buildContentHtml(doc);

	// アイキャッチ画像（trill:image）: mainImage -> problemImage -> answerImage の優先順
	const eyecatchSource = doc?.mainImage ?? doc?.problemImage ?? doc?.answerImage ?? null;
	const eyecatchUrl = eyecatchSource ? buildImageUrl(eyecatchSource, { width: 1200 }) : null;

	// 関連記事（trill:relatedItem）: 最大3件、自社サイト内のURLのみ
	const related: Array<{ title: string; link: string }> = (
		Array.isArray(doc?.related) ? doc.related : []
	)
		.filter((e: any) => typeof e?.slug === 'string' && typeof e?.title === 'string')
		.slice(0, 3)
		.map((e: any) => ({
			title: e.title.trim(),
			link: getAbsoluteUrl(`/quiz/${e.slug.trim()}`)
		}));

	return { title, link, guid: link, description, contentHtml, pubDate, atomUpdated, eyecatchUrl, related };
};

const buildItemXml = (item: NonNullable<ReturnType<typeof toItem>>): string => {
	const lines = [
		'  <item>',
		`    <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
		`    <link>${escapeXml(item.link)}</link>`,
		`    <title>${escapeXml(item.title)}</title>`,
		`    <description>${escapeXml(item.description)}</description>`,
		`    <content:encoded>${wrapCdata(item.contentHtml)}</content:encoded>`,
		`    <pubDate>${escapeXml(item.pubDate)}</pubDate>`
	];

	if (item.atomUpdated) {
		lines.push(`    <atom:updated>${escapeXml(item.atomUpdated)}</atom:updated>`);
	}

	if (item.eyecatchUrl) {
		lines.push(
			`    <trill:image url="${escapeAttr(item.eyecatchUrl)}">`,
			`      <trill:copyright url="${escapeAttr(SITE_URL)}">${escapeXml(SITE_NAME)}</trill:copyright>`,
			`    </trill:image>`
		);
	}

	for (const rel of item.related) {
		lines.push(
			`    <trill:relatedItem>`,
			`      <trill:title>${escapeXml(rel.title)}</trill:title>`,
			`      <trill:link>${escapeXml(rel.link)}</trill:link>`,
			`    </trill:relatedItem>`
		);
	}

	lines.push('  </item>');
	return lines.join('\n');
};

const buildFeed = (docs: any[]): string => {
	const now = toRfc822(new Date());
	const feedUrl = `${SITE_URL}${FEED_PATH}`;
	const itemsXml = docs
		.map(toItem)
		.filter(Boolean)
		.map((item) => buildItemXml(item!))
		.join('\n');

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0"',
		'  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
		'  xmlns:atom="http://www.w3.org/2005/Atom"',
		'  xmlns:trill="https://trilltrill.jp/rss-module/">',
		'<channel>',
		`  <title>${escapeXml(CHANNEL.title)}</title>`,
		`  <link>${escapeXml(CHANNEL.link)}</link>`,
		`  <description>${escapeXml(CHANNEL.description)}</description>`,
		`  <language>${escapeXml(CHANNEL.language)}</language>`,
		`  <pubDate>${escapeXml(now)}</pubDate>`,
		`  <lastBuildDate>${escapeXml(now)}</lastBuildDate>`,
		`  <atom:link href="${escapeAttr(feedUrl)}" rel="self" type="application/rss+xml" />`,
		itemsXml,
		'</channel>',
		'</rss>'
	].join('\n');
};

export const GET: RequestHandler = async ({ setHeaders }) => {
	const headers = {
		'Content-Type': 'application/xml; charset=utf-8',
		'Cache-Control': 'public, max-age=300, s-maxage=3600'
	};
	setHeaders(headers);

	if (shouldSkipSanityFetch()) {
		return new Response(buildFeed([]), { status: 200, headers });
	}

	try {
		const docs: any[] = await client.fetch(RSS_TRILL_QUERY);
		const feed = buildFeed(Array.isArray(docs) ? docs : []);
		return new Response(feed, { status: 200, headers });
	} catch (err: any) {
		console.error('[feed/trill] fetch error:', err?.message);
		return new Response(buildFeed([]), { status: 503, headers });
	}
};
