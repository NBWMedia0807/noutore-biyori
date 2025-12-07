import { client, urlFor } from '$lib/sanity/client';
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText'; // ★ Portable Text変換ヘルパーをインポート

const siteTitle = '脳トレ日和';
const siteLink = 'https://noutorebiyori.com/';
const siteDescription = '脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。';
const siteLogo = `${siteLink}logo.png`;

// XML特殊文字をエスケープするヘルパー関数
const escapeXml = (unsafe) => {
	if (!unsafe) return '';
	return unsafe.replace(/[<>&'"]/g, (c) => {
		switch (c) {
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			case "'":
				return '&apos;';
			case '"':
				return '&quot;';
			default:
				return c;
		}
	});
};

export async function GET() {
	const articles = await client.fetch(RSS_SMARTNEWS_QUERY);

	if (!articles) {
		return new Response('Articles not found', { status: 404 });
	}

	const buildItem = (article) => {
		// 記事のベースURL
		const articleLink = `${siteLink}${article.slug}`;

		// 記事の本文HTMLを生成するロジック
		let contentHtml = '';
		let descriptionText = '';

		// 記事タイプを判定して本文を組み立てる
		if (article._type === 'quiz') {
			// クイズの場合: problemDescriptionとanswerExplanationを結合
			let problemHtml = article.problemDescription ? portableTextToHtml(article.problemDescription) : '';
			let answerHtml = article.answerExplanation ? portableTextToHtml(article.answerExplanation) : '';
			let closingHtml = article.closingMessage ? portableTextToHtml(article.closingMessage) : '';
			
			// 最終的なHTML
			contentHtml = `
				<h2>【問題】</h2>
				${problemHtml}
				<hr>
				<h2>【解説】</h2>
				${answerHtml}
				${closingHtml}
			`;

			// descriptionには問題文の冒頭を使用（HTMLタグを削除）
			const rawProblemText = problemHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawProblemText.substring(0, 100) + '...'; // 冒頭100文字を抜粋
		} else if (article._type === 'post' && article.body) {
			// 通常記事の場合: bodyフィールドを使用
			contentHtml = portableTextToHtml(article.body);
			
			// descriptionには本文の冒頭を使用
			const rawBodyText = contentHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawBodyText.substring(0, 100) + '...'; // 冒頭100文字を抜粋
		}

		// メイン画像URLを取得
		const mainImageUrl = article.mainImage?.asset?.url ? urlFor(article.mainImage).url() : siteLogo;

		// 記事公開日
		const pubDate = new Date(article.publishedAt || article._createdAt).toUTCString();

		return `
		<item>
			<title><![CDATA[ ${escapeXml(article.title)} ]]></title>
			<link>${articleLink}</link>
			<guid isPermaLink="true">${articleLink}</guid>
			<pubDate>${pubDate}</pubDate>
			<description><![CDATA[ ${escapeXml(descriptionText)} ]]></description>
			<content:encoded><![CDATA[ 
				<img src="${mainImageUrl}" alt="${escapeXml(article.title)}" />
				${contentHtml} 
			]]></content:encoded>
			<media:thumbnail url="${mainImageUrl}"/>
			<dc:creator>脳トレ日和</dc:creator>
			<snf:advertisement>
				<snf:sponsoredLink link="${siteLink}contact" thumbnail="${siteLogo}" title="お問い合わせ" advertiser="${siteTitle}"/>
			</snf:advertisement>
		</item>
		`.trim();
	};

	const items = articles.map(buildItem).join('\n');

	// XMLヘッダー
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
		<copyright>© 2025 ${siteTitle}</copyright>
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
