import { client } from '$lib/server/sanity';
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq.js';
import { SITE } from '$lib/config/site.js';

// サイトの基本情報（SmartNews用）
const SITE_TITLE = SITE.title || '脳トレ日和';
const SITE_URL = 'https://noutorebiyori.com';
const SITE_DESCRIPTION = SITE.description || '毎日の脳トレで健康な生活を';
const SITE_LOGO = 'https://noutorebiyori.com/logo.png'; // 透過PNG推奨

export const GET = async () => {
	// 1. Sanityから記事データを取得
	const posts = await client.fetch(RSS_SMARTNEWS_QUERY);

	// 2. XMLのヘッダー部分
	const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:media="http://search.yahoo.com/mrss/"
	xmlns:snf="http://www.smartnews.be/snf">
	<channel>
		<title>${SITE_TITLE}</title>
		<link>${SITE_URL}/</link>
		<description>${SITE_DESCRIPTION}</description>
		<pubDate>${new Date().toUTCString()}</pubDate>
		<language>ja</language>
		<copyright>© ${new Date().getFullYear()} ${SITE_TITLE}</copyright>
		<snf:logo><url>${SITE_LOGO}</url></snf:logo>
		<ttl>60</ttl>
`;

	// 3. 各記事（item）の生成
	const xmlItems = posts.map((post) => {
		const postUrl = `${SITE_URL}/quiz/${post.slug}`;
		const pubDate = new Date(post.publishedAt || post._createdAt).toUTCString();
		const imageUrl = post.mainImage?.asset?.url || '';
		
		// 本文の生成（簡易的なテキスト結合）
		// ※本来はPortableTextをHTMLに変換する必要がありますが、まずはテキストとして結合します
		let contentHtml = '';
		if (post.problemDescription) contentHtml += `<p>【問題】<br>${post.problemDescription}</p>`;
		if (post.answerExplanation) contentHtml += `<hr><p>【解説】<br>${post.answerExplanation}</p>`;
		if (post.closingMessage) contentHtml += `<p>${post.closingMessage}</p>`;

		return `
		<item>
			<title><![CDATA[${post.title}]]></title>
			<link>${postUrl}</link>
			<guid isPermaLink="true">${postUrl}</guid>
			<pubDate>${pubDate}</pubDate>
			<description><![CDATA[${post.problemDescription || ''}]]></description>
			<content:encoded><![CDATA[
				${imageUrl ? `<img src="${imageUrl}" alt="${post.title}" />` : ''}
				${contentHtml}
			]]></content:encoded>
			${post.category?.name ? `<category>${post.category.name}</category>` : ''}
			${imageUrl ? `<media:thumbnail url="${imageUrl}" />` : ''}
			<dc:creator>${SITE_TITLE}</dc:creator>
			<snf:advertisement>
				<snf:sponsoredLink link="${SITE_URL}/contact" thumbnail="${SITE_LOGO}" title="お問い合わせ" advertiser="${SITE_TITLE}"/>
			</snf:advertisement>
		</item>`;
	}).join('');

	// 4. フッターと合体
	const xmlFooter = `
	</channel>
</rss>`;

	const xml = xmlHeader + xmlItems + xmlFooter;

	// 5. レスポンスとして返す
	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
