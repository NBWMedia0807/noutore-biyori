// src/lib/analytics/surfaces.js
//
// GA4 で「どの面で読まれたか」を表す共通の値。
// 本体サイト（$lib/ga.ts）と配信フィードの計測タグ（$lib/rss/feedAnalytics.js）の
// 両方から参照するので、依存の無い純粋な定数モジュールにしてある。
//
// GA4 側でカスタムディメンションとして登録する必要があるパラメータ名も
// ここに並べてある（登録手順は docs/ga4-measurement.md を参照）。

/** content_surface: 記事が実際に表示された面 */
export const CONTENT_SURFACE = {
  /** noutorebiyori.com のページを実際にロードした閲覧 */
  website: 'website',
  /** SmartNews SmartView のアプリ内閲覧 */
  smartview: 'smartview',
  /** グノシー / ニュースライト / auサービスToday のアプリ内閲覧 */
  gunosyApp: 'gunosy_app',
};

/** distribution_platform: どの配信網から届いた記事か */
export const DISTRIBUTION_PLATFORM = {
  smartnews: 'smartnews',
  gunosy: 'gunosy',
};

/** アプリ内ビューアの閲覧を表す専用イベント名（本体サイトの page_view とは分ける） */
export const SMARTVIEW_PAGE_VIEW_EVENT = 'smartview_page_view';
export const GUNOSY_PAGE_VIEW_EVENT = 'gunosy_page_view';
