import { client, urlFor } from '$lib/sanity/client';
import { RSS_SMARTNEWS_QUERY } from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText';
import { QUIZ_PUBLISHED_FILTER } from '$lib/queries/quizVisibility.js';

const siteTitle = '脳トレ日和';
const siteLink = 'https://noutorebiyori.com/';
const siteDescription =
	'脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。';
const siteLogo = 'https://noutorebiyori.com/logo.png';

// 「さらにもう一問」用のクエリ
// 修正: QUIZ_PUBLISHED_FILTERが先頭に&&を含んでいるため、直前の&&を削除して結合
const nextChallengeQuery = /* groq */ `*[_type == "quiz" && slug.current != $slug && category._ref == $categoryId && defined(problemImage.asset) ${QUIZ_PUBLISHED_FILTER}] | order(publishedAt desc)[0...3]{
  title,
  "slug": slug.current,
  "image": problemImage.asset->url
}`;

// 最新クイズリスト（広告枠用）
// 修正: こちらも同様に直前の&&を削除
const globalLatestQuizzesQuery = /* groq */ `*[_type == "quiz" ${QUIZ_PUBLISHED_FILTER}] | order(publishedAt desc)[0...8]{
  title,
  "slug": slug.current,
  problemImage,
  mainImage
}`;

// 画像オブジェクトからURLを生成するヘルパー関数
const getImageUrl = (imageObject) => {
	if (!imageObject || !urlFor) return '';
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

// 本文の改行を<br>に変換するヘルパー関数
const convertNewlinesToBr = (html) => {
	if (!html) return '';
	return html.replace(/\n/g, '<br>');
};

export async function GET() {
	try {
		const articles = await client.fetch(RSS_SMARTNEWS_QUERY);
		const globalLatestQuizzes = await client.fetch(globalLatestQuizzesQuery);

		if (!articles) {
			// 記事が取得できなかった場合でも処理を続行
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

			// 画像配置
			if (primaryImageUrl) {
				contentHtml += `<img src="${primaryImageUrl}" alt="${escapeXml(article.title)}の画像" /><br>`;
			}

			// 記事タイプごとの処理
			if (article._type === 'quiz') {
				// Null安全対策
				const problemHtml = convertNewlinesToBr(portableTextToHtml(article.problemDescription || []));
				const hintsHtml = convertNewlinesToBr(portableTextToHtml(article.hints || []));
				const answerHtml = convertNewlinesToBr(portableTextToHtml(article.answerExplanation || []));
				const closingHtml = convertNewlinesToBr(portableTextToHtml(article.closingMessage || []));
				const answerImageUrl = getImageUrl(article.answerImage);

				// 本文組み立て
				contentHtml += `<h2>【問題】</h2>`;
				contentHtml += problemHtml;

				if (hintsHtml) {
					contentHtml += `<hr><h3>★ ヒント</h3>${hintsHtml}`;
				}

				contentHtml += `<hr><h2>【解説】</h2>`;
				if (answerImageUrl) {
					contentHtml += `<img src="${answerImageUrl}" alt="${escapeXml(
						article.title
					)}の正解画像" /><br>`;
				}
				contentHtml += answerHtml;

				contentHtml += closingHtml;
			} else if (article._type === 'post') {
				contentHtml += convertNewlinesToBr(portableTextToHtml(article.body || []));
			}

			// 「さらにもう一問」セクション
			// 修正: category._ref は存在しないため _id を使用
			if (article._type === 'quiz' && article.category?._id) {
				try {
					const nextChallengePosts = await client.fetch(nextChallengeQuery, {
						slug: article.slug,
						categoryId: article.category._id // 修正: _ref -> _id
					});

					if (nextChallengePosts && nextChallengePosts.length > 0) {
						let nextChallengeHtml = `
            <hr />
            <h3 style="font-size: 18px; font-weight: bold; margin-top: 20px; color: #7c2d12;">さらにもう一問！</h3>
            <ul style="list-style: none; padding: 0;">
          `;
						for (const post of nextChallengePosts) {
							const postUrl = `https://noutorebiyori.com/quiz/${post.slug}`;
							const imageUrl = post.image;
							if (imageUrl) {
								nextChallengeHtml += `
                <li style="margin-bottom: 15px; clear: both;">
                  <a href="${postUrl}" style="text-decoration: none; color: #1d4ed8; font-weight: bold;">
                    <img src="${imageUrl}" style="float: left; width: 100px; height: 75px; object-fit: cover; margin-right: 10px; border-radius: 4px;" />
                    <span style="display: block; overflow: hidden;">${escapeXml(post.title)}</span>
                  </a>
                </li>
              `;
							}
						}
						nextChallengeHtml += '</ul>';
						contentHtml += nextChallengeHtml;
					}
				} catch (e) {
					console.error('Failed to fetch next challenge posts for RSS:', e);
				}
			}

			// サムネイル
			const thumbnail = primaryImageUrl || siteLogo;

			// 日付
			const pubDate = new Date(article.publishedAt || article._createdAt).toUTCString();

			// 広告枠
			const advertisementLinks = (globalLatestQuizzes || [])
				.filter((quiz) => quiz.slug !== article.slug)
				.slice(0, 5)
				.map((quiz) => {
					const link = `${siteLink}quiz/${quiz.slug}`;
					const thumbnailUrl =
						getImageUrl(quiz.problemImage) || getImageUrl(quiz.mainImage) || siteLogo;
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

			// 関連記事
			const relatedLinksXml = (article.relatedLinks || [])
				.map((related) => {
					if (!related.slug || !related.title) return null;
					const relatedUrl =
						related._type === 'quiz' ? `${siteLink}quiz/${related.slug}` : `${siteLink}${related.slug}`;
					return `<snf:relatedLink link="${relatedUrl}" title="${escapeXml(related.title)}" />`;
				})
				.filter(Boolean)
				.join('\n\t\t\t');

			// CDATA修正
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

		const items = (
			await Promise.all((articles || []).map((article) => buildItem(article, globalLatestQuizzes)))
		).join('\n');

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
				'Cache-Control': 'max-age=0, s-maxage=3600'
			}
		});
	} catch (err) {
		console.error('RSS Feed Generation Error:', err);
		return new Response('Internal Server Error', { status: 500 });
	}
}
