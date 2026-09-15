// 配信フィードの記事URLに UTM パラメータを付ける。
//
// ── なぜ必要か ──────────────────────────────────────────
// ニュースアプリ経由の流入はアプリ内ブラウザが Referer を送らないため、
// GA4 で (direct)/(none) に落ちる（28日間で 26,751 セッション = 73.7%）。
// GA4 は Referer が無くても URL の utm_* パラメータからキャンペーンを判定するので、
// 配信するURLに媒体名を書いておけば正しく参照元を記録できる。
//
// ── 対象外 ──────────────────────────────────────────────
// SmartNews フィードには付けない。SmartNews の SmartFormat 仕様が
// <link> から UTM を除くことを推奨しているため。

/**
 * SmartNews の「回遊枠」に付ける utm_source / utm_medium。
 *
 * item の <link> には引き続き付けない（上の「対象外」のとおり）。
 * 一方、広告枠（snf:sponsoredLink）・関連記事枠（snf:relatedLink）・本文末テキストリンクは
 * SmartView から自社サイトへ出ていく外向きリンクなので、計測のため付与する。
 *
 * medium を referral ではなく recirculation にしているのは、
 * SmartView 内の表示（snf:analytics 経由で `smartnews.com / referral` として記録される）と
 * 「実際にサイトへ着地した人」を GA4 上で確実に見分けるため。
 */
export const SMARTNEWS_RECIRCULATION_UTM = {
  source: 'smartnews',
  medium: 'recirculation',
};

/** 回遊枠のどこから来たかを表す utm_content。枠ごとのクリック数を比較するために使う。 */
export const SMARTNEWS_RECIRCULATION_CONTENT = {
  sponsoredLink: 'sponsoredlink',
  bodyLink: 'bodylink',
  relatedLink: 'relatedlink',
};

/** 各フィードに割り当てる utm_source。GA4 のレポートに出る名前になる。 */
export const FEED_UTM_SOURCE = {
  // グノシー / ニュースパス / auサービスToday は <link> を共有しているため
  // 3アプリを区別できない。媒体側が別フィードを用意できたら分離する。
  gunosy: 'gunosy',
  trill: 'trill',
  merkystyle: 'merkystyle',
};

/**
 * 絶対URLに utm_source / utm_medium / utm_campaign を付けて返す。
 *
 * 壊さないことを優先する:
 *   - 空文字・非文字列 → '' を返す
 *   - URL として解釈できない値 → 元の値をそのまま返す
 *   - 既に utm_source が付いている → 二重付与せず元の値を返す
 *
 * @param {string} url 絶対URL
 * @param {object} options
 * @param {string} options.source utm_source（FEED_UTM_SOURCE の値）
 * @param {string} [options.medium='referral'] utm_medium
 * @param {string} [options.campaign='feed'] utm_campaign
 * @param {string} [options.content] utm_content（指定時のみ付与。回遊枠の区別に使う）
 * @returns {string} UTM 付きURL
 */
export const withFeedUtm = (
  url,
  { source, medium = 'referral', campaign = 'feed', content } = {}
) => {
  if (typeof url !== 'string' || url === '') return '';
  if (typeof source !== 'string' || source === '') return url;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    // 相対URLや不正な値は加工せずそのまま返す（フィードを壊さない）
    return url;
  }

  if (parsed.searchParams.has('utm_source')) return url;

  parsed.searchParams.set('utm_source', source);
  parsed.searchParams.set('utm_medium', medium);
  parsed.searchParams.set('utm_campaign', campaign);
  if (typeof content === 'string' && content !== '') {
    parsed.searchParams.set('utm_content', content);
  }
  return parsed.toString();
};
