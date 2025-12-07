import { client, urlFor } from '$lib/sanity/client'; // urlForをインポート
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText'; 

const siteTitle = '脳トレ日和';
const siteLink = 'https://noutorebiyori.com/';
const siteDescription = '脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。';
const siteLogo = `${siteLink}logo.png`;

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

export async function GET() {
	const articles = await client.fetch(RSS_SMARTNEWS_QUERY);

	if (!articles) {
		// 記事が取得できなかった場合は、空のRSSを返すが、アイテムがない状態
		// エラーにはせず、空のXML構造を維持する
	}

	const buildItem = (article) => {
		// 記事URL (slugが 'matchstick-quiz/article/100' のような形式でくることを想定)
		const articleLink = `${siteLink}${article.slug}`;

		let contentHtml = '';
		let descriptionText = '';

		// URL生成（getImageUrlを使用）
		const problemImageUrl = getImageUrl(article.problemImage);
		const answerImageUrl = getImageUrl(article.answerImage);

		// ★ 記事タイプごとの処理
		if (article._type === 'quiz') {
			
			// 1. 各パーツのHTML化
			const problemHtml = article.problemDescription ? portableTextToHtml(article.problemDescription) : '';
			const hintsHtml = article.hints ? portableTextToHtml(article.hints) : '';
			const answerHtml = article.answerExplanation ? portableTextToHtml(article.answerExplanation) : '';
			const closingHtml = article.closingMessage ? portableTextToHtml(article.closingMessage) : '';

			// 2. 本文の組み立て（SmartNewsで見やすい順序）
			// 【問題セクション】
			contentHtml += `<h2>【問題】</h2>`;
			if (problemImageUrl) {
				contentHtml += `<img src="${problemImageUrl}" alt="${escapeXml(article.title)}の問題画像" /><br>`;
			}
			contentHtml += problemHtml;

			// 【ヒントセクション】(あれば表示)
			if (hintsHtml) {
				contentHtml += `<hr><h3>★ ヒント</h3>${hintsHtml}`;
			}

			// 【解説セクション】
			contentHtml += `<hr><h2>【解説】</h2>`;
			if (answerImageUrl) {
				contentHtml += `<img src="${answerImageUrl}" alt="${escapeXml(article.title)}の正解画像" /><br>`;
			}
			contentHtml += answerHtml;
			
			// 【締め】
			contentHtml += closingHtml;

			// 3. Description生成（問題文の冒頭）
			const rawText = problemHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawText.substring(0, 100) + (rawText.length > 100 ? '...' : '');

		} else if (article._type === 'post') {
			// 通常記事の場合
			contentHtml = article.body ? portableTextToHtml(article.body) : '';
			const rawText = contentHtml.replace(/<[^>]*>?/gm, '');
			descriptionText = rawText.substring(0, 100) + '...';
		}
        
        // 最終チェック
        if (!contentHtml.trim()) {
            descriptionText = '';
        }

		// サムネイル画像（mainImageがあればそれ、なければ問題画像）
		const thumbnail = getImageUrl(article.mainImage) || problemImageUrl || siteLogo;
		
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

	const items = (articles || []).map(buildItem).join('\n'); // articlesがnullでも動くように

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
