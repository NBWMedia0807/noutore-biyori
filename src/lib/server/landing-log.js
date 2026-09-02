// src/lib/server/landing-log.js
//
// 着地リクエスト（サイトへの入口となる HTML ドキュメントのリクエスト）を
// ログに出すかどうかの判定と、ログ1行の組み立て。
//
// SvelteKit 固有の import（$app / $env）を持たない純粋なモジュールにしてあるため、
// tests/landing-log.test.mjs からそのまま import して検証できる。
// hooks.server.js 側は「環境変数を読む」「console.log する」だけに徹する。
// （$lib/rss/gunosyFeed.js と同じ方針）
//
// ── 何のためのログか ────────────────────────────────────
// GunosyRSS 連携の開始後、GA4 の「セッションの参照元/メディア」で
// `(direct) / (none)` と `(not set)` が流入の大半を占めている。
// グノシー／ニュースライト／auサービスToday のアプリ内ブラウザは Referer を
// 落とすため direct 扱いになっている、というのが現時点の見立てだが、
// 実際にどんな User-Agent / Referer で着地しているかは実測しないと確定できない。
// このログで実データを取り、GA4 側の識別方法（UA 判定でキャンペーンを付与するか、
// フィードの link に UTM を付けるか）を決める。

// ログを出さないパス。アセット・API・フィードは「着地」ではないので除外する。
const IGNORED_PATH_PREFIXES = ['/api/', '/feed/', '/rss/', '/_app/', '/.well-known/'];
const IGNORED_PATHS = new Set(['/robots.txt', '/sitemap.xml', '/favicon.ico']);

// 拡張子付き（画像・フォント等）は静的アセットとみなす
const ASSET_PATTERN = /\.[a-z0-9]{2,5}$/i;

// ログ1行が肥大化しないよう、長いヘッダーは切り詰める
export const MAX_VALUE_LENGTH = 200;

export const truncate = (value) => {
  if (typeof value !== 'string' || !value) return '';
  return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
};

/**
 * このリクエストを「着地」としてログに出すか。
 *
 * SPA 内のページ遷移はサーバーにドキュメント要求を出さない（データ要求になる）ため、
 * ここを通るのは実質「サイトへの入口」か「リロード」だけになる。
 *
 * @param {{
 *   method?: string,
 *   pathname?: string,
 *   secFetchDest?: string | null,
 *   isDataRequest?: boolean,
 *   isSubRequest?: boolean,
 * }} input
 */
export const isLandingRequest = ({
  method = 'GET',
  pathname = '/',
  secFetchDest = null,
  isDataRequest = false,
  isSubRequest = false,
} = {}) => {
  if (isDataRequest || isSubRequest) return false;
  if (method !== 'GET') return false;

  if (IGNORED_PATHS.has(pathname)) return false;
  if (IGNORED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (ASSET_PATTERN.test(pathname)) return false;

  // Sec-Fetch-Dest を送るブラウザでは、ドキュメント要求以外を確実に除外できる。
  // アプリ内 WebView では送られないことがあるため、無い場合は通す。
  if (secFetchDest && secFetchDest !== 'document') return false;

  return true;
};

/**
 * User-Agent / Referer から流入元を推測する。
 * 計測の判定に使うものではなく、ログを目視で追うときの目印。
 * 実際に何が入ってくるかを見るためのログなので、外れても構わない。
 */
export const guessSource = (ua = '', referer = '') => {
  const haystack = `${ua} ${referer}`.toLowerCase();
  if (haystack.includes('gunosy-servicetoday')) return 'au_service_today';
  if (haystack.includes('gunosy-newspass') || haystack.includes('newspass')) return 'newspass';
  if (haystack.includes('gunosy')) return 'gunosy';
  if (haystack.includes('smartnews')) return 'smartnews';
  if (haystack.includes('trilltrill') || haystack.includes('trill')) return 'trill';
  if (haystack.includes('allabout')) return 'allabout';
  if (referer) return 'referral';
  return 'unknown';
};

export const LANDING_LOG_PREFIX = '[landing]';

/**
 * ログ1行を組み立てる。
 * IP・クッキーなど個人を特定しうる情報は含めない。
 *
 * @param {{
 *   pathname?: string,
 *   search?: string,
 *   userAgent?: string | null,
 *   referer?: string | null,
 *   secFetchSite?: string | null,
 *   secFetchMode?: string | null,
 *   acceptLanguage?: string | null,
 * }} input
 */
export const buildLandingLogLine = ({
  pathname = '/',
  search = '',
  userAgent = '',
  referer = '',
  secFetchSite = '',
  secFetchMode = '',
  acceptLanguage = '',
} = {}) => {
  const ua = userAgent ?? '';
  const ref = referer ?? '';
  return `${LANDING_LOG_PREFIX} ${JSON.stringify({
    path: pathname,
    query: truncate(search),
    guess: guessSource(ua, ref),
    ua: truncate(ua),
    ref: truncate(ref),
    // Sec-Fetch-* は「どこから来たか」の一次情報。
    // Referer が空でも `none`（アドレスバー直打ち・アプリからの起動）と
    // `cross-site`（外部サイトからのリンク）を区別できる。
    sfs: secFetchSite ?? '',
    sfm: secFetchMode ?? '',
    lang: truncate(acceptLanguage ?? ''),
  })}`;
};
