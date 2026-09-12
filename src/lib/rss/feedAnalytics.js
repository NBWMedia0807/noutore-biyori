// src/lib/rss/feedAnalytics.js
//
// 配信先アプリの「アプリ内ビューア」で動く GA4 計測タグを組み立てる。
// SmartNews の <snf:analytics> と Gunosy の <gnf:analytics*> の両方がここを使う。
//
// ── なぜ専用イベントにするのか ──────────────────────────────
// SmartNews SmartView / グノシー系のアプリ内ビューアは、こちらのフィードから
// 受け取った本文をアプリ内で描画する。ユーザーは noutorebiyori.com を1バイトも
// ロードしていないが、ここに置いた計測タグは動くため、
// 素の `gtag('config', ID)`（= page_view が自動送信される）にしておくと
// GA4 の「表示回数」に本体サイトの PV と同じものとして混ざってしまう。
//
// GA4 の「表示回数」は page_view / screen_view だけを数える指標なので、
// アプリ内ビューアでは
//   - `send_page_view: false` で自動 page_view を止める
//   - 代わりに専用イベント（smartview_page_view / gunosy_page_view）を送る
// ことで、「表示回数 = 本体サイトの PV」を成立させる。
// 閲覧数そのものは専用イベントのイベント数として残るので情報は失わない。
//
// ── 参照元（セッションの参照元/メディア）について ────────────
// アプリ内ビューアからのヒットは Referer が無かったり（→ (direct)/(none)）、
// アプリのドメインが付いたり（→ smartnews.com / referral）して、
// 「本体サイトへ実際に遷移した流入」と見分けが付かない。
// そこで campaign_source / campaign_medium を明示し、
//   - smartnews / smartview → SmartView のアプリ内閲覧
//   - gunosy    / app_view  → グノシー系のアプリ内閲覧
//   - smartnews.com / referral, gunosy / referral → 本体サイトへの実遷移
// を分離する。配信そのもの（本文・URL・画像）には一切影響しない。
//
// ── 配信仕様上の制約 ────────────────────────────────────────
//   - JavaScript で動く計測コードは1 item につき1つまで（両媒体共通）
//   - CDATA の中に置くため `]]>` と `</script>` を出さないこと
//     （toJsString で < > を \u003c \u003e にエスケープして担保する）

// 面・配信網・イベント名の定数は本体サイト側（$lib/ga.ts）と共有する。
// このファイルは tests/ や scripts/ から Node で直接読み込まれるため相対パスで import する。
import {
  CONTENT_SURFACE,
  DISTRIBUTION_PLATFORM,
  GUNOSY_PAGE_VIEW_EVENT,
  SMARTVIEW_PAGE_VIEW_EVENT,
} from '../analytics/surfaces.js';

export {
  CONTENT_SURFACE,
  DISTRIBUTION_PLATFORM,
  GUNOSY_PAGE_VIEW_EVENT,
  SMARTVIEW_PAGE_VIEW_EVENT,
};

/** XML/JS に入れてはいけない制御文字を落とす */
const sanitize = (value) =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : '';

/**
 * JavaScript の文字列リテラルとして安全に埋め込む。
 * < > をエスケープするので、CDATA の終端 `]]>` も `</script>` も出力されない。
 */
const toJsString = (value) =>
  JSON.stringify(sanitize(value)).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

/** 測定IDが未設定・プレースホルダ（G-XXXXXXXXXX）なら計測タグを出さない */
const isUsableMeasurementId = (measurementId) =>
  typeof measurementId === 'string' && measurementId !== '' && !/X{4,}/.test(measurementId);

/** 絶対URLからパス部分（/category/xxx/yyy）だけを取り出す */
export const toArticlePath = (articleUrl) => {
  if (typeof articleUrl !== 'string' || articleUrl === '') return '';
  try {
    return new URL(articleUrl).pathname;
  } catch {
    return articleUrl.startsWith('/') ? articleUrl : '';
  }
};

/** `{key:value,...}` の形に組み立てる（値が空のキーは出さない） */
const toJsObject = (entries) =>
  `{${entries
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}:${typeof value === 'string' ? toJsString(value) : value}`)
    .join(',')}}`;

/**
 * アプリ内ビューア用の GA4 スニペットを組み立てる共通処理。
 *
 * @param {object} params
 * @param {string} params.measurementId GA4 測定ID
 * @param {string} params.eventName 送信する専用イベント名
 * @param {string} params.contentSurface content_surface
 * @param {string} params.distributionPlatform distribution_platform
 * @param {string} params.campaignSource campaign_source
 * @param {string} params.campaignMedium campaign_medium
 * @param {string} params.campaignName campaign_name
 * @param {string} params.articleUrl 記事の canonical URL（page_location に使う）
 * @param {string} params.articleTitle 記事タイトル
 * @param {string} [params.articleSlug] 記事スラッグ
 * @param {string} [params.articleCategory] カテゴリ名
 * @returns {string} `<script>...</script>`（測定IDが無ければ空文字）
 */
const buildInAppAnalyticsSnippet = ({
  measurementId,
  eventName,
  contentSurface,
  distributionPlatform,
  campaignSource,
  campaignMedium,
  campaignName,
  articleUrl,
  articleTitle,
  articleSlug,
  articleCategory,
}) => {
  if (!isUsableMeasurementId(measurementId)) return '';

  const id = toJsString(measurementId);
  const articlePath = toArticlePath(articleUrl);

  // config: 自動 page_view を止めたうえで、この面の識別情報を既定値として持たせる。
  // page_location / page_title に元記事の情報を渡し、アプリ内の中間URLで
  // 集計されないようにする（Gunosy の /v1/xxxx のようなURL対策）。
  const configParams = toJsObject([
    ['send_page_view', false],
    ['page_location', articleUrl],
    ['page_title', articleTitle],
    ['content_surface', contentSurface],
    ['distribution_platform', distributionPlatform],
    ['campaign_source', campaignSource],
    ['campaign_medium', campaignMedium],
    ['campaign_name', campaignName],
  ]);

  // 専用イベント: 記事単位で閲覧数を集計できるように記事の識別情報も持たせる。
  const eventParams = toJsObject([
    ['content_surface', contentSurface],
    ['distribution_platform', distributionPlatform],
    ['article_path', articlePath],
    ['article_title', articleTitle],
    ['article_slug', articleSlug],
    ['article_category', articleCategory],
    ['page_location', articleUrl],
    ['page_title', articleTitle],
  ]);

  return (
    `<script>(function(){` +
    `var s=document.createElement('script');s.async=true;` +
    `s.src='https://www.googletagmanager.com/gtag/js?id='+${id};` +
    `document.head.appendChild(s);` +
    `window.dataLayer=window.dataLayer||[];` +
    `function gtag(){window.dataLayer.push(arguments);}` +
    `window.gtag=gtag;` +
    `gtag('js',new Date());` +
    `gtag('config',${id},${configParams});` +
    `gtag('event',${toJsString(eventName)},${eventParams});` +
    `})();</script>`
  );
};

/**
 * SmartNews SmartView（<snf:analytics>）用の計測タグ。
 * SmartView での閲覧を smartview_page_view として送り、page_view は送らない。
 */
export const buildSmartViewAnalyticsSnippet = ({
  measurementId,
  articleUrl,
  articleTitle,
  articleSlug,
  articleCategory,
} = {}) =>
  buildInAppAnalyticsSnippet({
    measurementId,
    eventName: SMARTVIEW_PAGE_VIEW_EVENT,
    contentSurface: CONTENT_SURFACE.smartview,
    distributionPlatform: DISTRIBUTION_PLATFORM.smartnews,
    campaignSource: 'smartnews',
    campaignMedium: 'smartview',
    campaignName: 'smartformat',
    articleUrl,
    articleTitle,
    articleSlug,
    articleCategory,
  });

/**
 * グノシー系アプリ内ビューア（<gnf:analytics> / _gn / _st）用の計測タグ。
 * アプリ内での閲覧を gunosy_page_view として送り、page_view は送らない。
 *
 * ※ グノシー / ニュースライト / auサービスToday は同じフィード・同じURLを共有するため、
 *    campaign_source は 3アプリまとめて 'gunosy' になる（アプリ単位の内訳は
 *    グノシー管理画面のクリック実績側で見る）。
 */
export const buildGunosyAnalyticsSnippet = ({
  measurementId,
  articleUrl,
  articleTitle,
  articleSlug,
  articleCategory,
} = {}) =>
  buildInAppAnalyticsSnippet({
    measurementId,
    eventName: GUNOSY_PAGE_VIEW_EVENT,
    contentSurface: CONTENT_SURFACE.gunosyApp,
    distributionPlatform: DISTRIBUTION_PLATFORM.gunosy,
    campaignSource: 'gunosy',
    campaignMedium: 'app_view',
    campaignName: 'feed',
    articleUrl,
    articleTitle,
    articleSlug,
    articleCategory,
  });
