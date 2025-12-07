import { client } from '$lib/sanity/client';
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText'; 

const siteTitle = '脳トレ日和';
const siteLink = 'https://noutorebiyori.com/';
const siteDescription = '脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。';
const siteLogo = `${siteLink}logo.png`;

// XML特殊文字エスケープ
const escapeXml = (unsafe) => {
	if (!unsafe) return '';
	return unsafe.replace(/[<>&'"]/g, (c) => {
		switch (c) {
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '&': return '&amp;';
			case "'": return '&apos;';
			case '"': return '&quot;';
			default: return c;
		}
	});
};

export async function GET() {
	const articles = await client.fetch(RSS_SMARTNEWS_QUERY);

	if (!articles) {
		return new Response('Articles not found', { status: 404 });
	}

	const buildItem = (article) => {
		// 記事URL
		const articleLink = `${siteLink}quiz/${article.slug}`; // クイズ記事のURL構造に合わせる

		let contentHtml = '';
		let descriptionText = '';

		// ★ 記事タイプごとの処理
		if (article._type === 'quiz') {
			
			// 1. 各パーツのHTML化
			const problemHtml = article.problemDescription ? portableTextToHtml(article.problemDescription) : '';
			const hintsHtml = article.hints ? portableTextToHtml(article.hints) : ''; // ★hintsに対応
			const answerHtml = article.answerExplanation ? portableTextToHtml(article.answerExplanation) : '';
			const closingHtml = article.closingMessage ? portableTextToHtml(article.closingMessage) : '';

			// 2. 画像URL
			const problemImageUrl = article.problemImage?.url || '';
			const answerImageUrl = article.answerImage?.url || '';

			// 3. 本文の組み立て（SmartNewsで見やすい順序）
			// 【問題セクション】
			contentHtml += `<h2>【問題】</h2>`;
			if (problemImageUrl) {
				contentHtml += `<img src="${problemImageUrl}" alt="問題画像" /><br>`;
			}
			contentHtml += problemHtml;

			// 【ヒントセクション】(あれば表示)
			if (hintsHtml) {
				contentHtml += `<hr><h3>★ ヒント</h3>${hintsHtml}`;
			}

			// 【解説セクション】
			contentHtml += `<hr><h2>【解説】</h2>`;
			if (answerImageUrl) {
				contentHtml += `<img src="${answerImageUrl}" alt="正解画像" /><br>`;
			}
			contentHtml += answerHtml;
			
			// 【締め】
			contentHtml += closingHtml;

			// 4. Description生成（問題文の冒頭）
			const rawText = problemHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawText.substring(0, 100) + '...';

		} else if (article._type === 'post') {
			// 通常記事の場合
			contentHtml = article.body ? portableTextToHtml(article.body) : '';
			const rawText = contentHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawText.substring(0, 100) + '...';
		}

		// サムネイル画像（mainImageがあればそれ、なければ問題画像）
		const thumbnail = article.mainImage?.url || article.problemImage?.url || siteLogo;
		
		// 日付
		const pubDate = new Date(article.publishedAt || article._createdAt).toUTCString();

		return `
		<item>
			<title><![CDATA[ ${escapeXml(article.title)} ]]></title>
			<link>${articleLink}</link>
			<guid isPermaLink="true">${articleLink}</guid>
			<pubDate>${pubDate}</pubDate>
			<description><![CDATA[ ${escapeXml(descriptionText)} ]]></description>
			<content:encoded><![CDATA[ 
				${contentHtml} 
			]]></content:encoded>
			<media:thumbnail url="${thumbnail}"/>
			<dc:creator>脳トレ日和</dc:creator>
			<category>${escapeXml(article.category?.title || article.category?.name || 'クイズ')}</category>
			<snf:advertisement>
				<snf:sponsoredLink link="${siteLink}contact" thumbnail="${siteLogo}" title="お問い合わせ" advertiser="${siteTitle}"/>
			</snf:advertisement>
		</item>
		`.trim();
	};

	const items = articles.map(buildItem).join('\n');

	// XML全体
	const xml = `
	<?xml version="1.0" encoding="UTF-8"?>
	<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"
		xmlns:dc="http://purl.org/dc/elements/1.1/"
		xmlns:media="http://search.yahoo.com/mrss/"
		xmlns:snf="http://www.smartnews.be/snf"
		version="2.0">
	<channel>
		<title>${siteTitle}</title>
		<link>${siteLink}</link>
		<description>${siteDescription}</description>
		<pubDate>${new Date().toUTCString()}</pubDate>
		<language>ja</language>
		<copyright>© ${new Date().getFullYear()} ${siteTitle}</copyright>
		<snf:logo>
			<url>${siteLogo}</url>
		</snf:logo>
		<ttl>60</ttl>
		${items}
	</channel>
	</rss>
	`.trim();

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600',
		},
	});
}
