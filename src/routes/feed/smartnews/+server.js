import { client, urlFor } from '$lib/sanity/client';
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText';
import { QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';

const siteTitle = '脳トレ日和';
const siteLink = 'https://noutorebiyori.com/';
const siteDescription =
	'脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。';
const siteLogo = 'https://noutorebiyori.com/logo.png';

// 最新クイズリスト（広告枠用）
const globalLatestQuizzesQuery = /* groq */ `*[_type == "quiz" ${QUIZ_PUBLISHED_FILTER}] | order(publishedAt desc)[0...8]{
  title,
  "slug": slug.current,
  problemImage,
  mainImage
}`;

// 画像オブジェクトからURLを生成するヘルパー関数（安全対策版）
const getImageUrl = (imageObject) => {
	if (!imageObject || !imageObject.asset) return '';
	try {
		return urlFor(imageObject).url();
	} catch (e) {
		console.error('Image URL generation failed:', e);
		return '';
	}
};

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

// PortableTextを安全に変換するラッパー（null対策）
const safePortableTextToHtml = (blocks) => {
	if (!blocks) return '';
	try {
		return portableTextToHtml(blocks);
	} catch (e) {
		console.error('PortableText conversion failed:', e);
		return '';
	}
};

export async function GET() {
	try {
		// 並列でデータを取得
		const [articles, globalLatestQuizzes] = await Promise.all([
			client.fetch(RSS_SMARTNEWS_QUERY),
			client.fetch(globalLatestQuizzesQuery)
		]);

		if (!articles) {
			console.warn('No articles fetched for SmartNews RSS');
		}

		const buildItem = async (article, globalLatestQuizzes) => {
			// 記事URL
			let articleLink;
			if (article._type === 'quiz') {
				articleLink = `${siteLink}quiz/${article.slug}`;
			} else {
				articleLink = `${siteLink}${article.slug}`;
			}

			// 画像設定
			const problemImageUrl = getImageUrl(article.problemImage);
			const mainImageUrl = getImageUrl(article.mainImage);
			const primaryImageUrl = problemImageUrl || mainImageUrl;

			let contentHtml = '';

			// content:encodedの冒頭に画像を配置
			if (primaryImageUrl) {
				contentHtml += `<img src="${primaryImageUrl}" alt="${escapeXml(article.title)}の画像" /><br>`;
			}

			// ★ 記事タイプごとの処理
			if (article._type === 'quiz') {
				// 1. 各パーツのHTML化 (安全な変換関数を使用)
				const problemHtml = convertNewlinesToBr(safePortableTextToHtml(article.problemDescription));
				const hintsHtml = convertNewlinesToBr(safePortableTextToHtml(article.hints));
				const answerHtml = convertNewlinesToBr(safePortableTextToHtml(article.answerExplanation));
				const closingHtml = convertNewlinesToBr(safePortableTextToHtml(article.closingMessage));
				const answerImageUrl = getImageUrl(article.answerImage);

				// 2. 本文の組み立て
				contentHtml += `<h2>【問題】</h2>`;
				contentHtml += problemHtml;

				if (hintsHtml) {
					// <hr> を削除し、<br><br> に変更
					contentHtml += `<br><br><h3>★ ヒント</h3>${hintsHtml}`;
				}

				// <hr> を削除し、<br><br> に変更
				contentHtml += `<br><br><h2>【解説】</h2>`;
				if (answerImageUrl) {
					contentHtml += `<img src="${answerImageUrl}" alt="${escapeXml(article.title)}の正解画像" /><br>`;
				}
				contentHtml += answerHtml;
				contentHtml += closingHtml;

			} else if (article._type === 'post') {
				contentHtml += convertNewlinesToBr(safePortableTextToHtml(article.body));
			}

			// 「さらにもう一問」セクションの追加
			// 【SmartNews/MSN対策】
			// 1. 画像は<a>の外に独立配置（フィードリーダーが<a>内<img>を無視する問題の回避）
			// 2. テキストリンクに記事タイトルを使用（どのクイズかわかるようにする）
			// 3. インラインスタイル・width属性を除去（フィードリーダー互換性向上）
			// 4. テンプレートリテラルのインデント空白を排除（HTMLパース問題の回避）
			if (article._type === 'quiz' && article.relatedLinks && article.relatedLinks.length > 0) {
				let nextChallengeHtml = '<br /><br /><h3>さらにもう一問！</h3>';

				for (const post of article.relatedLinks) {
					if (!post || !post.slug || !post.title) continue;

					const postUrl = `https://noutorebiyori.com/quiz/${post.slug}`;
					const title = escapeXml(post.title);
					const imageUrl = getImageUrl(post.problemImage) || getImageUrl(post.mainImage);

					// 画像がある場合：画像を独立表示＋タイトルリンク
					if (imageUrl) {
						nextChallengeHtml += `<p><img src="${imageUrl}" alt="${title}" /></p>` +
							`<p>▶ <a href="${postUrl}">${title}</a></p>`;
					} else {
						// 画像がない場合：タイトルリンクのみ
						nextChallengeHtml += `<p>▶ <a href="${postUrl}">${title}</a></p>`;
					}
				}
				contentHtml += nextChallengeHtml;
			}

			// サムネイル画像
			const thumbnail = primaryImageUrl || siteLogo;
			// 日付
			const pubDate = new Date(article.publishedAt || article._createdAt).toUTCString();

			// 広告枠の生成
			const advertisementLinks = (globalLatestQuizzes || [])
				.filter((quiz) => quiz.slug !== article.slug)
				.slice(0, 2)
				.map((quiz) => {
					const link = `${siteLink}quiz/${quiz.slug}`;
					const thumbnailUrl = getImageUrl(quiz.problemImage) || getImageUrl(quiz.mainImage) || siteLogo;
					const title = escapeXml(quiz.title);
					return `<snf:sponsoredLink link="${link}" thumbnail="${thumbnailUrl}" title="${title}" advertiser="${siteTitle}"/>`;
				})
				.join('\n\t\t\t');

			const advertisementXml = advertisementLinks
				? `
			<snf:advertisement>
				${advertisementLinks}
			</snf:advertisement>
			`
				: '';

			// 関連記事のXMLを生成（マーキースタイル対策：thumbnail属性維持）
			const relatedLinksXml = (article.relatedLinks || [])
				.map((related) => {
					if (!related.slug || !related.title) return null;
					const relatedUrl =
						related._type === 'quiz' ? `${siteLink}quiz/${related.slug}` : `${siteLink}${related.slug}`;

					// 関連リンクの画像URL
					const relatedThumb = getImageUrl(related.problemImage) || getImageUrl(related.mainImage);
					const thumbAttr = relatedThumb ? ` thumbnail="${relatedThumb}"` : '';

					return `<snf:relatedLink link="${relatedUrl}" title="${escapeXml(related.title)}"${thumbAttr} />`;
				})
				.filter(Boolean)
				.join('\n\t\t\t');

			// CDATAセクションが壊れるのを防ぐ
			const safeContentHtml = contentHtml.replace(/]]>/g, ']]&gt;');

			return `
		<item>
			<title>${escapeXml(article.title)}</title>
			<link>${articleLink}</link>
			<guid isPermaLink="true">${articleLink}</guid>
			<pubDate>${pubDate}</pubDate>
			<description><![CDATA[]]></description>
			<content:encoded><![CDATA[${safeContentHtml}]]></content:encoded>
			<media:thumbnail url="${thumbnail}"/>
			<dc:creator>脳トレ日和</dc:creator>
			<category>${escapeXml(article.category?.title || article.category?.name || 'クイズ')}</category>
			${advertisementXml}
			${relatedLinksXml}
		</item>
		`.trim();
		};

		const itemsArray = await Promise.all((articles || []).map((article) => buildItem(article, globalLatestQuizzes)));
		const items = itemsArray.join('\n');

		// XML全体
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
</rss>`.trim();

		return new Response(xml, {
			headers: {
				'Content-Type': 'application/xml',
				'Cache-Control': 'max-age=0, s-maxage=3600'
			}
		});
	} catch (err) {
		console.error('RSS Feed Generation Critical Error:', err);
		return new Response('Internal Server Error', { status: 500 });
	}
}
