import { client } from '$lib/sanity.server.js';
import { urlFor } from '$lib/sanity/client';
import {
	RSS_SMARTNEWS_MATCHSTICK_QUERY,
	RSS_SMARTNEWS_OTHERS_QUERY
} from '$lib/queries/rssSmartnews.groq';
import { portableTextToHtml } from '$lib/utils/portableText';
import { QUIZ_FEED_SAFE_FILTER } from '$lib/queries/quizVisibility.js';
import { buildSmartViewAnalyticsSnippet } from '$lib/rss/feedAnalytics.js';
import { dedupeBySlug, selectSmartnewsItems } from '$lib/rss/feedSlots.js';
import {
	MATCHSTICK_SLUG_PREFIX,
	SMARTNEWS_RECIRCULATION_CONTENT,
	allocateRecirculationSlots,
	buildRecirculationUrl,
	escapeHtmlAttr
} from '$lib/rss/smartnewsRecirculation.js';

const siteTitle = '脳トレ日和';
const siteLink = 'https://noutorebiyori.com/';
const siteDescription =
	'脳トレ日和は、間違い探しや計算問題などの脳トレクイズを通じて、毎日の習慣づくりをサポートする無料のWebメディアです。高齢者の方でも安心して楽しめるシンプルな操作性と見やすいデザインが特徴です。';
const siteLogo = 'https://noutorebiyori.com/logo.png';
// SmartView（アプリ内ビューア）に置く GA4 の測定ID。本体サイトと同じプロパティに送る。
// 面の区別は content_surface / 専用イベント名で行うため、測定IDは分けない。
const GA_MEASUREMENT_ID = 'G-855Y7S6M95';

// 回遊枠で使う記事の共通射影。どのプールから来ても同じ形で扱えるようにする。
const RECIRCULATION_PROJECTION = /* groq */ `{
  _type,
  title,
  "slug": slug.current,
  "categorySlug": category->slug.current,
  problemImage,
  mainImage
}`;

// サイト全体の新着プール。カテゴリやマッチ棒のプールが浅いときの最終フォールバック。
// 是正対象（reviewStatus）と本文に "null" が出る記事は回遊枠からも除外する。
const globalLatestQuizzesQuery = /* groq */ `*[_type == "quiz" ${QUIZ_FEED_SAFE_FILTER}]
  | order(publishedAt desc)[0...12]${RECIRCULATION_PROJECTION}`;

// マッチ棒クイズの新着プール。媒体の売りなので関連記事枠（snf:relatedLink）の固定枠に使う。
// マッチ棒記事自身を表示しているときは、広告枠・本文末も含めて8件をここから取る。
const matchstickQuizzesQuery = /* groq */ `*[
  _type == "quiz"
  && string::startsWith(slug.current, "${MATCHSTICK_SLUG_PREFIX}")
  ${QUIZ_FEED_SAFE_FILTER}
] | order(publishedAt desc)[0...12]${RECIRCULATION_PROJECTION}`;

// クイズの canonical URL（カテゴリ別 URL）を生成するヘルパー。
// サイト側 (/quiz/[...slug]) は単一セグメントのスラッグを
// /category/{categorySlug}/{slug} へ 308 リダイレクトしているため、
// フィードでは最初から canonical URL を出力し、リダイレクトを経ずに
// 正しい記事へ到達できるようにする（item.link と記事内容の不一致・404 を防ぐ）。
// 複数セグメントのスラッグ（matchstick 等の特殊記事）は従来どおり /quiz/{slug}。
const buildQuizUrl = (slug, categorySlug) => {
	if (categorySlug && !String(slug).includes('/')) {
		return `${siteLink}category/${categorySlug}/${slug}`;
	}
	return `${siteLink}quiz/${slug}`;
};

// 回遊枠のリンクURL生成に canonical URL の組み立てを渡す。
// URL の作り方（308リダイレクト回避のためのカテゴリ別URL）は配信側の事情なので、
// 純粋モジュール側には持たせず注入する。
const recirculationUrl = (quiz, content, fallbackCategorySlug) =>
	buildRecirculationUrl(quiz, content, { buildQuizUrl, fallbackCategorySlug });

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

// PortableTextブロックからプレーンテキストを抽出
const portableTextToPlainText = (blocks) => {
	if (!Array.isArray(blocks)) return '';
	return blocks
		.map((block) => {
			if (block._type !== 'block' || !Array.isArray(block.children)) return '';
			return block.children.map((child) => child.text || '').join('');
		})
		.join(' ')
		.trim();
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

export async function GET({ request }) {
	console.log(`[SmartNews Feed] User-Agent: ${request.headers.get('user-agent') ?? 'unknown'}`);
	try {
		// 並列でデータを取得。
		// 配信する記事はマッチ棒と他カテゴリを別々に取る。30枠の配分は feedSlots.js が決める
		// （以前は GROQ の並び替えだけで決めており、マッチ棒が30枠すべてを占めていた）。
		const [matchstickArticles, otherArticles, globalLatestQuizzes, matchstickQuizzes] =
			await Promise.all([
				client.fetch(RSS_SMARTNEWS_MATCHSTICK_QUERY),
				client.fetch(RSS_SMARTNEWS_OTHERS_QUERY),
				client.fetch(globalLatestQuizzesQuery),
				client.fetch(matchstickQuizzesQuery)
			]);

		if (!matchstickArticles?.length && !otherArticles?.length) {
			console.warn('No articles fetched for SmartNews RSS');
		}

		// 同一スラッグの記事（再公開記事などスラッグが重複したドキュメント）が複数存在すると、
		// item.link が同一 URL を指して重複したり、リンク先が別ドキュメントに解決されて
		// 「item.link と記事内容が一致しない」事象につながる。スラッグ単位で最新の1件のみに絞り込む。
		// （dedupeBySlug は selectSmartnewsItems の中でも実行されるが、
		//   どのスラッグを捨てたかをログに残すためここでも通す）
		const warnDuplicate = (article) => {
			console.warn(`[SmartNews Feed] Duplicate slug skipped: ${article.slug} (_id: ${article._id})`);
		};
		const dedupedArticles = selectSmartnewsItems({
			matchstick: dedupeBySlug(matchstickArticles || [], warnDuplicate),
			others: dedupeBySlug(otherArticles || [], warnDuplicate)
		});

		const categoryCounts = dedupedArticles.reduce((acc, article) => {
			const key = article.category?.slug || '(no-category)';
			acc[key] = (acc[key] ?? 0) + 1;
			return acc;
		}, {});
		console.log(`[SmartNews Feed] items=${dedupedArticles.length} ${JSON.stringify(categoryCounts)}`);

		const buildItem = async (article, globalLatestQuizzes, matchstickQuizzes) => {
			// 記事下の回遊枠（合計8枠）への割り当て。
			// 表示中の記事と枠をまたいだ重複は $lib/rss/smartnewsRecirculation.js 側で排除される。
			const { adSlots, bodyLinks, relatedSlots } = allocateRecirculationSlots({
				article,
				categoryPool: article.relatedLinks,
				matchstickPool: matchstickQuizzes,
				globalPool: globalLatestQuizzes
			});

			// 記事URL（クイズはカテゴリ別 canonical URL を使用）
			let articleLink;
			if (article._type === 'quiz') {
				articleLink = buildQuizUrl(article.slug, article.category?.slug);
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
					contentHtml += `<br><br><h3>★ ヒント</h3>${hintsHtml}`;
				}

				contentHtml += `<br><br><h2>【解説】</h2>`;
				if (answerImageUrl) {
					contentHtml += `<img src="${answerImageUrl}" alt="${escapeXml(article.title)}の正解画像" /><br>`;
				}
				contentHtml += answerHtml;
				contentHtml += closingHtml;

			} else if (article._type === 'post') {
				contentHtml += convertNewlinesToBr(safePortableTextToHtml(article.body));
			}

			// 「関連記事」セクションの追加
			// 【SmartFormat外部リンクガイドライン対応】
			// 本文内に画像付きの外部リンクを置くと NG事例4（最終パラグラフ以降に画像でクイズを
			// 出題し遷移させる）に該当し違反となるため、画像は付けない。
			// SmartNews が許可する「最終パラグラフ以降の関連記事扱い・最大3本・テキストリンク」
			// の形で出力する（BODY_LINK_COUNT = 3 を超えない割り当てになっている）。
			// ※ この RSS は SmartNews・ママテナ・イチオシ共通で、いずれもこの準拠版を配信する。
			//
			// quiz / post のどちらにも出す。以前はクイズ本文にしか関連記事が無かったため
			// `_type === 'quiz'` で絞っていたが、回遊枠はマッチ棒プールとサイト全体の新着から
			// 埋めるようになったので、コラム記事（post）でも3枠を使える。
			// ここで絞ると割り当て済みの3件が出力されずに捨てられ、post だけ 5枠になってしまう。
			if (bodyLinks.length > 0) {
				let relatedHtml = '<br /><br /><h3>関連記事</h3>';

				for (const post of bodyLinks) {
					const postUrl = recirculationUrl(
						post,
						SMARTNEWS_RECIRCULATION_CONTENT.bodyLink,
						article.category?.slug
					);
					const title = escapeXml(post.title);

					// テキストリンクのみ（画像なし）。
					// CDATA 内の HTML なので、href の & は HTML として &amp; にしておく。
					relatedHtml += `<p>▶ <a href="${escapeHtmlAttr(postUrl)}">${title}</a></p>`;
				}
				contentHtml += relatedHtml;
			}

			// サムネイル画像
			const thumbnail = primaryImageUrl || siteLogo;
			// 日付
			const pubDate = new Date(article.publishedAt || article._createdAt).toUTCString();

			// 広告枠の生成（サムネイル付き・記事下で最も目立つ枠）
			const advertisementLinks = adSlots
				.map((quiz) => {
					const link = recirculationUrl(
						quiz,
						SMARTNEWS_RECIRCULATION_CONTENT.sponsoredLink,
						article.category?.slug
					);
					const thumbnailUrl = getImageUrl(quiz.problemImage) || getImageUrl(quiz.mainImage) || siteLogo;
					const title = escapeXml(quiz.title);
					// UTM 付きURLには & が入るため、XML 属性としてエスケープする
					return `<snf:sponsoredLink link="${escapeXml(link)}" thumbnail="${escapeXml(thumbnailUrl)}" title="${title}" advertiser="${siteTitle}"/>`;
				})
				.join('\n\t\t\t\t');

			const advertisementXml = advertisementLinks
				? `
			<snf:advertisement>
				${advertisementLinks}
			</snf:advertisement>
			`
				: '';

			// 関連記事のXMLを生成（マーキースタイル対策：thumbnail属性維持）。
			// マッチ棒クイズの「推し枠」。本文末テキストリンクとは別の記事が入る。
			const relatedLinksXml = relatedSlots
				.map((related) => {
					const relatedUrl = recirculationUrl(
						related,
						SMARTNEWS_RECIRCULATION_CONTENT.relatedLink,
						article.category?.slug
					);

					// 関連リンクの画像URL
					const relatedThumb = getImageUrl(related.problemImage) || getImageUrl(related.mainImage);
					const thumbAttr = relatedThumb ? ` thumbnail="${escapeXml(relatedThumb)}"` : '';

					return `<snf:relatedLink link="${escapeXml(relatedUrl)}" title="${escapeXml(related.title)}"${thumbAttr} />`;
				})
				.join('\n\t\t\t');

			// CDATAセクションが壊れるのを防ぐ
			const safeContentHtml = contentHtml.replace(/]]>/g, ']]&gt;');

			// SmartView（アプリ内ビューア）での閲覧を計測するタグ。
			// SmartView は noutorebiyori.com をロードせずに本文を描画するため、
			// 通常の page_view ではなく専用イベント smartview_page_view を送る。
			// （理由と GA4 側の見方は $lib/rss/feedAnalytics.js のコメント参照）
			const analyticsSnippet = buildSmartViewAnalyticsSnippet({
				measurementId: GA_MEASUREMENT_ID,
				articleUrl: articleLink,
				articleTitle: article.title,
				articleSlug: article.slug,
				articleCategory: article.category?.title || article.category?.name || ''
			});
			// 測定IDが未設定のときは空要素を出さず、要素ごと省略する
			const analyticsXml = analyticsSnippet
				? `<snf:analytics><![CDATA[${analyticsSnippet}]]></snf:analytics>`
				: '';

			return `
		<item>
			<title>${escapeXml(article.title)}</title>
			<link>${articleLink}</link>
			<guid isPermaLink="true">${articleLink}</guid>
			<pubDate>${pubDate}</pubDate>
			<description><![CDATA[${escapeXml(article.seoDescription || portableTextToPlainText(article.problemDescription).slice(0, 120))}]]></description>
			<content:encoded><![CDATA[${safeContentHtml}]]></content:encoded>
			<media:thumbnail url="${thumbnail}"/>
			<dc:creator>脳トレ日和</dc:creator>
			<category>${escapeXml(article.category?.title || article.category?.name || 'クイズ')}</category>
			${advertisementXml}
			${relatedLinksXml}
			${analyticsXml}
		</item>
		`.trim();
		};

		const itemsArray = await Promise.all(
			dedupedArticles.map((article) =>
				buildItem(article, globalLatestQuizzes, matchstickQuizzes)
			)
		);
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
	<ttl>15</ttl>
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
