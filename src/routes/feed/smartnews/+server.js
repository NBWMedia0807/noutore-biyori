import { client, urlFor } from '$lib/sanity/client';
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText'; 

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
	// クエリに answerImage と hint が含まれていることを前提とします
	const articles = await client.fetch(RSS_SMARTNEWS_QUERY);

	if (!articles) {
		return new Response('Articles not found', { status: 404 });
	}

	const buildItem = (article) => {
		// 記事のベースURL
		const articleLink = `${siteLink}${article.slug}`;

		let contentHtml = '';
		let descriptionText = '';
		let rawProblemText = ''; 
		
		// 正解画像URLを取得 (あれば)
		const answerImageUrl = article.answerImage?.asset?.url ? urlFor(article.answerImage).url() : '';


		// ★ 記事タイプを判定する（クイズ特有のフィールドがあるか）
		if (article.problemDescription || article.answerExplanation) {
			
			// 1. 各Portable TextフィールドのHTML変換
			let problemHtml = article.problemDescription ? portableTextToHtml(article.problemDescription) : '';
			let hintHtml = article.hint ? portableTextToHtml(article.hint) : ''; // 【ヒント】
			let answerHtml = article.answerExplanation ? portableTextToHtml(article.answerExplanation) : '';
			let closingHtml = article.closingMessage ? portableTextToHtml(article.closingMessage) : '';
			
			// 2. 問題部分の構築
			let problemSection = `<h2>【問題】</h2>`;
			problemSection += problemHtml;
			
			// ヒントを追加
			if (hintHtml) {
				problemSection += `<hr><h3>★ ヒント</h3>${hintHtml}`;
			}


			// 3. 解説部分の構築
			let answerSection = `<h2>【解説】</h2>`;

			// 正解画像を解説の前に挿入
			if (answerImageUrl) {
				answerSection += `<img src="${answerImageUrl}" alt="${escapeXml(article.title)}の正解画像" />`;
			}

			answerSection += answerHtml;
			answerSection += closingHtml;
			answerSection += '<hr>';


			// 4. 最終的なHTML
			contentHtml = `
				${problemSection}
				${answerSection}
			`;

			// descriptionには問題文の冒頭を使用
			rawProblemText = problemHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawProblemText.substring(0, 100) + (rawProblemText.length > 100 ? '...' : ''); 

		} else if (article.body) {
			// 通常記事の場合: bodyフィールドを使用
			contentHtml = portableTextToHtml(article.body);
			
			// descriptionには本文の冒頭を使用
			const rawBodyText = contentHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawBodyText.substring(0, 100) + '...'; 
		}
        
        // 最終チェック: contentHtmlが空の場合は、descriptionも空にする
        if (!contentHtml.trim()) {
            descriptionText = '';
        }

		// メイン画像URLを取得 (サムネイルとcontent:encodedの冒頭画像として使用)
		const mainImage = article.mainImage || article.problemImage; 
		const mainImageUrl = mainImage?.asset?.url ? urlFor(mainImage).url() : siteLogo;

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
