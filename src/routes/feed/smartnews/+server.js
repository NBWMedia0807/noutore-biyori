import { client, urlFor } from '$lib/sanity/client'; // urlForをインポート
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText'; 

const siteTitle = '脳トレ日和';
const siteLink = 'https://noutorebiyori.com/';
const siteDescription = '脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。';
const siteLogo = 'https://noutorebiyori.com/logo.png'; // 要件4: ロゴのURLを絶対パスに修正

// 画像オブジェクトからURLを生成するヘルパー関数
const getImageUrl = (imageObject) => imageObject ? urlFor(imageObject).url() : '';

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

// 本文の改行を<br>に変換するヘルパー関数
const convertNewlinesToBr = (html) => {
    if (!html) return '';
    return html.replace(/\n/g, '<br>');
};

export async function GET() {
	const articles = await client.fetch(RSS_SMARTNEWS_QUERY);

	if (!articles) {
		// 記事が取得できなかった場合でも、空のRSS構造を維持する
	}

	const buildItem = (article) => {
		// 記事URL
		let articleLink;
		if (article._type === 'quiz') {
			articleLink = `${siteLink}quiz/${article.slug}`;
		} else {
			articleLink = `${siteLink}${article.slug}`;
		}

		// 要件3: 画像設定の強化 (problemImageを優先)
		const problemImageUrl = getImageUrl(article.problemImage);
		const mainImageUrl = getImageUrl(article.mainImage);
		const primaryImageUrl = problemImageUrl || mainImageUrl;

		let contentHtml = '';

		// 要件3: content:encodedの冒頭に画像を配置
		if (primaryImageUrl) {
			contentHtml += `<img src="${primaryImageUrl}" alt="${escapeXml(article.title)}の画像" /><br>`;
		}

		// ★ 記事タイプごとの処理
		if (article._type === 'quiz') {
			// 1. 各パーツのHTML化と改行コードの変換 (要件2)
			const problemHtml = convertNewlinesToBr(portableTextToHtml(article.problemDescription));
			const hintsHtml = convertNewlinesToBr(portableTextToHtml(article.hints));
			const answerHtml = convertNewlinesToBr(portableTextToHtml(article.answerExplanation));
			const closingHtml = convertNewlinesToBr(portableTextToHtml(article.closingMessage));
			const answerImageUrl = getImageUrl(article.answerImage);

			// 2. 本文の組み立て
			contentHtml += `<h2>【問題】</h2>`;
			contentHtml += problemHtml; // problemImageは先頭で追加済みのため、ここではテキストのみ追加

			if (hintsHtml) {
				contentHtml += `<hr><h3>★ ヒント</h3>${hintsHtml}`;
			}

			contentHtml += `<hr><h2>【解説】</h2>`;
			if (answerImageUrl) {
				contentHtml += `<img src="${answerImageUrl}" alt="${escapeXml(article.title)}の正解画像" /><br>`;
			}
			contentHtml += answerHtml;
			
			contentHtml += closingHtml;

		} else if (article._type === 'post') {
			// 通常記事の場合 (要件2)
			contentHtml += convertNewlinesToBr(portableTextToHtml(article.body));
		}
        
		// 要件3: サムネイル画像 (problemImageを優先)
		const thumbnail = primaryImageUrl || siteLogo;
		
		// 日付
		const pubDate = new Date(article.publishedAt || article._createdAt).toUTCString();

		// 関連記事のXMLを生成
		const relatedLinksXml = (article.relatedLinks || [])
			.map(related => {
				if (!related.slug || !related.title) return null;
				// 関連記事も現時点ではクイズのみを想定
				const relatedUrl = related._type === 'quiz' 
					? `${siteLink}quiz/${related.slug}`
					: `${siteLink}${related.slug}`;
				return `<snf:relatedLink link="${relatedUrl}" title="${escapeXml(related.title)}" />`;
			})
			.filter(Boolean)
			.join('\n\t\t\t');

		return `
		<item>
			<title><![CDATA[ ${escapeXml(article.title)} ]]></title>
			<link>${articleLink}</link>
			<guid isPermaLink="true">${articleLink}</guid>
			<pubDate>${pubDate}</pubDate>
			<description><![CDATA[]]></description> 
			<content:encoded><![CDATA[ 
				${contentHtml} 
			]]></content:encoded>
			<media:thumbnail url="${thumbnail}"/>
			<dc:creator>脳トレ日和</dc:creator>
			<category>${escapeXml(article.category?.title || article.category?.name || 'クイズ')}</category>
			<snf:advertisement>
				<snf:sponsoredLink link="${siteLink}contact" thumbnail="${siteLogo}" title="お問い合わせ" advertiser="${siteTitle}"/>
			</snf:advertisement>
			${relatedLinksXml}
		</item>
		`.trim();
	};

	const items = (articles || []).map(buildItem).join('\n');

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
