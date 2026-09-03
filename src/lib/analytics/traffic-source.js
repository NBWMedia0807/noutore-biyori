// src/lib/analytics/traffic-source.js
//
// 流入元（配信パートナー）の判定と、GA4 へ送るイベントパラメータの組み立て。
//
// SvelteKit 固有の import を持たない純粋なモジュールにしてあるため、
// tests/traffic-source.test.mjs からそのまま import して検証できる
// （$lib/rss/gunosyFeed.js と同じ方針）。
//
// ── なぜ必要か ──────────────────────────────────────────
// グノシー／ニュースライト／auサービスToday のアプリ内ブラウザは Referer を
// 送らないため、GA4 では大半が (direct) / (none) に落ちて判別できない。
// サーバー側で User-Agent を記録する方法（hooks.server.js）は、記事ページが
// ISR（expiration: false）でエッジキャッシュされ関数が起動しないため機能しない。
// そこでブラウザ側で判定し、GA4 のイベントパラメータとして送る。
//
// ── 方針（フェーズA）─────────────────────────────────────
// セッションの参照元 / メディアは **書き換えない**。
// gtag('set','campaign',...) は使わず、content_group と traffic_partner
// （カスタムディメンション）を足すだけにする。
// これにより (direct)/(none) の内訳が見えるようになる一方で、
// 既存レポートの数値と時系列は一切変わらない。

/** サイト本体のページビューに付けるコンテンツグループ */
export const SITE_CONTENT_GROUP = 'site';
/** グノシー等のアプリ内ビューアで読まれた記事に付けるコンテンツグループ */
export const IN_APP_CONTENT_GROUP = 'gunosy_inapp';

/** 判定できなかったときに送る値。「未計測」と「判定不能」を区別するため空にしない */
export const UNKNOWN_PARTNER = 'unknown';

// GA4 のイベントパラメータ値は100文字まで
export const MAX_PARAM_LENGTH = 100;

// アプリ内ブラウザの User-Agent から流入元を判定する。
// 具体的な文字列がまだ実測できていないため、Gunosy 系は表記ゆれを広めに拾う。
// 並び順が優先順位（先に一致したものを採用）。
const PARTNER_UA_PATTERNS = [
  [/Gunosy[-_ ]?Servicetoday/i, 'au_service_today'],
  [/Gunosy[-_ ]?Newspass/i, 'newspass'],
  [/Newspass/i, 'newspass'],
  [/Gunosy/i, 'gunosy'],
  [/SmartNews/i, 'smartnews'],
];

// Referer が残っている場合の判定。ホスト名の後方一致で見る。
const PARTNER_REFERRER_HOSTS = [
  [/(^|\.)service-top\.jp$/i, 'au_service_today'],
  [/(^|\.)newspass\.jp$/i, 'newspass'],
  [/(^|\.)gunosy\.com$/i, 'gunosy'],
  [/(^|\.)smartnews\.com$/i, 'smartnews'],
  [/(^|\.)allabout\.co\.jp$/i, 'allabout'],
  [/(^|\.)trilltrill\.jp$/i, 'trill'],
];

const truncate = (value, max = MAX_PARAM_LENGTH) =>
  typeof value === 'string' && value.length > max ? value.slice(0, max) : value || '';

const hostOf = (referrer) => {
  if (typeof referrer !== 'string' || !referrer.trim()) return '';
  try {
    return new URL(referrer).hostname;
  } catch {
    return '';
  }
};

/**
 * 配信パートナーを判定する。
 * 確実に一致したときだけ値を返し、判定できなければ null を返す
 * （＝検索流入などを取り違えて汚染しないため、迷ったら何も付けない）。
 *
 * @param {{userAgent?: string, referrer?: string}} input
 * @returns {string|null}
 */
export const detectPartner = ({ userAgent = '', referrer = '' } = {}) => {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  for (const [pattern, partner] of PARTNER_UA_PATTERNS) {
    if (pattern.test(ua)) return partner;
  }
  const host = hostOf(referrer);
  if (host) {
    for (const [pattern, partner] of PARTNER_REFERRER_HOSTS) {
      if (pattern.test(host)) return partner;
    }
  }
  return null;
};

// User-Agent から「どのブラウザにも共通して現れる部分」を落とす。
// 残るのはアプリ固有の識別子だけなので、UA 全体を GA4 に送らずに済む。
// 並び順が重要。OS表記のようにキーワードを内包するものを先に落とさないと、
// 内側の語（iPhone など）だけが先に消えて "CPU OS 17_5" のような残骸が出る。
const STANDARD_UA_TOKENS = [
  /Mozilla\/[\d.]+/gi,
  /AppleWebKit\/[\d.]+/gi,
  /\(KHTML,? like Gecko\)/gi,
  /Gecko\/[\d.]+/gi,
  // OS 表記（内包する語より先に落とす）
  /CPU (?:iPhone |iPad )?OS [\d_]+ like Mac OS X/gi,
  /Intel Mac OS X [\d_.]+/gi,
  /Android [\d.]+/gi,
  /Windows NT [\d.]+/gi,
  /CrOS \S+ [\d.]+/gi,
  // ブラウザのバージョン表記
  /(?:Chrome|CriOS|Safari|Version|FxiOS|Firefox|Edg|EdgiOS|OPR)\/[\d.]+/gi,
  /Mobile\/\w+/gi,
  // 残った単独キーワード
  /\b(?:Mobile|Macintosh|Win64|x64|X11|Linux(?: x86_64)?|iPhone|iPad|iPod|Build\/\w+)\b/gi,
  /like Mac OS X/gi,
];

/**
 * 判定できなかった User-Agent から、アプリ固有の識別子だけを抜き出す。
 * 「どんな UA で来ているか」を GA4 上で確認し、判定パターンを育てるための手がかり。
 *
 * @param {string} userAgent
 * @returns {string} 100文字以内。手がかりが無ければ空文字
 */
export const buildUaFingerprint = (userAgent = '') => {
  if (typeof userAgent !== 'string' || !userAgent.trim()) return '';
  let rest = userAgent;
  for (const pattern of STANDARD_UA_TOKENS) rest = rest.replace(pattern, ' ');

  // 残りのうち「名前/バージョン」形式のものだけを拾う。
  // アプリ内ブラウザは自身を Gunosy/1.0 や FBAV/470.0 のように名乗るため、
  // この形だけ見れば十分で、端末の型番（SC-52B など）を拾わずに済む。
  const tokens = rest.match(/[A-Za-z][\w.-]*\/[\w.]+/g);
  if (!tokens) return '';

  // 同じ識別子が複数回出ることがあるので重複を除く
  return truncate([...new Set(tokens)].join(' '));
};

/**
 * page_view に付けるイベントパラメータを組み立てる。
 * セッションの参照元 / メディアには一切触れない（フェーズA）。
 *
 * @param {{userAgent?: string, referrer?: string, storedPartner?: string|null}} input
 * @returns {{partner: string, params: Record<string, string>}}
 *   partner はセッション内で使い回すために保存する値
 */
export const buildTrafficParams = ({
  userAgent = '',
  referrer = '',
  storedPartner = null,
} = {}) => {
  // セッション中に一度判定できていれば、それを使い続ける。
  // 2ページ目以降は Referer が自サイトになり判定できなくなるため。
  const partner = storedPartner || detectPartner({ userAgent, referrer }) || UNKNOWN_PARTNER;

  /** @type {Record<string, string>} */
  const params = {
    content_group: SITE_CONTENT_GROUP,
    traffic_partner: partner,
  };

  // 判定できなかったときだけ、UA の手がかりを添える
  if (partner === UNKNOWN_PARTNER) {
    const fingerprint = buildUaFingerprint(userAgent);
    if (fingerprint) params.traffic_partner_ua = fingerprint;
  }

  return { partner, params };
};
