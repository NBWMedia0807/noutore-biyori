// src/lib/analytics/appWebview.js
//
// 本体サイトのページが「どのアプリのアプリ内ブラウザで開かれたか」を User-Agent から判定する。
//
// ── なぜ必要か ──────────────────────────────────────────
// 「アプリ内ビューアの閲覧」と「本体サイトの閲覧」は、イベント名で確実に分かれる
// （smartview_page_view / gunosy_page_view ＝ アプリ内ビューア、page_view ＝ 本体サイト）。
// タグが動く場所そのものが違うので、この判定は 100% 確実で UA 判定には依存しない。
//
// 分からないのは「本体サイトの PV の内訳」のほう。
// SmartNews のアプリ内ブラウザで noutorebiyori.com を開いた PV は、本体サイトの PV として
// 正しく数えたいが、現状これを識別できるのは「セッションの参照元 = smartnews.com / referral」
// だけだった。これはセッション単位の属性なので、SmartView で記事を読んだ直後に
// 本体サイトへ遷移して同一セッションが続くと、本体サイトの PV まで
// SmartView 側の参照元に寄ってしまい、正確に分かれない。
//
// そこで page_view にイベント単位の目印を付ける。セッションの切れ方に左右されず、
// 「この1 PV はどこで開かれたか」を単独で判定できるようにする。
//
// ── 判定の限界（重要） ──────────────────────────────────
// これは User-Agent 文字列の部分一致による推定なので、確実ではない。
// アプリ内ブラウザが自分の名前を UA に載せない場合は 'browser'（通常ブラウザ）になる。
// したがって 'browser' は「アプリ内ブラウザではない」ことの証明にはならない。
//
// 「アプリ内ビューアか、本体サイトか」という一番大事な切り分けは**イベント名**で行うこと。
// このパラメータは本体サイト PV の内訳を見るための補助情報として使う。

/** app_webview パラメータに入る値 */
export const APP_WEBVIEW = {
  smartnews: 'smartnews',
  /** グノシー本体 */
  gunosy: 'gunosy',
  /** ニュースライト（旧ニュースパス） */
  newspass: 'newspass',
  /** auサービスToday */
  auServiceToday: 'au_service_today',
  trill: 'trill',
  /** 通常のブラウザ（＝アプリ内ブラウザだと判定できなかったものを含む） */
  browser: 'browser',
};

// 判定の順序が意味を持つ。グノシー系は 'gunosy' を含む UA を共有しうるので、
// 個別アプリ（auサービスToday / ニュースライト）を先に判定する。
const MATCHERS = [
  [APP_WEBVIEW.auServiceToday, ['gunosy-servicetoday', 'servicetoday']],
  [APP_WEBVIEW.newspass, ['gunosy-newspass', 'newspass']],
  [APP_WEBVIEW.gunosy, ['gunosy']],
  [APP_WEBVIEW.smartnews, ['smartnews']],
  [APP_WEBVIEW.trill, ['trilltrill', 'trill']],
];

/**
 * User-Agent から、ページを開いたアプリ内ブラウザを推定する。
 *
 * @param {string | undefined | null} userAgent navigator.userAgent
 * @returns {string} APP_WEBVIEW のいずれか（判定できなければ 'browser'）
 */
export const detectAppWebview = (userAgent) => {
  if (typeof userAgent !== 'string' || userAgent === '') return APP_WEBVIEW.browser;

  const haystack = userAgent.toLowerCase();
  for (const [value, needles] of MATCHERS) {
    if (needles.some((needle) => haystack.includes(needle))) return value;
  }
  return APP_WEBVIEW.browser;
};
