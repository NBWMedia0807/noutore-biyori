// 広告表記（ステマ規制・AdSense ラベル）の文言と判定をこの1か所にまとめる。
// 文言は法務・規約担当の文案（2026-11-24）どおり。変更するときは法務・規約担当の確認を取ること。

// ── サイトの広告の使用状況 ──────────────────────
// 'adsense'           : Google AdSense のみ
// 'affiliate+adsense' : アフィリエイト広告と AdSense の両方
// 'none'              : どちらも使っていない（フッターの表記を出さない）
// 脳トレ日和は AdSense 配信中・アフィリエイト提携なし（マネタイズ担当 2026-11-24）。
export const SITE_AD_USAGE = 'adsense';

// ── フッター（サイト全体）の表記 ────────────────
export const FOOTER_TEXT_AFFILIATE_AND_ADSENSE =
  '当サイトはアフィリエイト広告およびGoogle AdSenseを利用しています。広告リンクを経由した購入や申込みなどにより、当社が報酬を受け取る場合があります。';
export const FOOTER_TEXT_ADSENSE_ONLY = '当サイトはGoogle AdSenseによる広告を掲載しています。';

/**
 * 使用状況からフッターの表記を決める。どちらも使っていなければ null（表記なし）。
 * @param {string} [usage]
 * @returns {string|null}
 */
export function getFooterAdText(usage = SITE_AD_USAGE) {
  if (usage === 'affiliate+adsense') return FOOTER_TEXT_AFFILIATE_AND_ADSENSE;
  if (usage === 'adsense') return FOOTER_TEXT_ADSENSE_ONLY;
  return null;
}

export const FOOTER_AD_TEXT = getFooterAdText();

// ── 広告枠のラベル ─────────────────────────────
// 「広告」に統一する（「スポンサーリンク」「PR」「おすすめ」は使わない）。
export const AD_SLOT_LABEL = '広告';

// ── 記事ごとの表記 ─────────────────────────────
export const ARTICLE_AFFILIATE_TEXT = '広告：この記事にはアフィリエイト広告が含まれます。';

// 会社名のあとに「社」を足さない名前：
// 「社」をすでに含む（「A社」「株式会社A」「A株式会社」「合同会社A」「一般社団法人A」）か、
// 法人・団体とわかる語で終わる（「A財団」「A協会」など）。
const hasOrgSuffix = (name) => name.includes('社') || /(法人|協会|組合|機構|財団|団体)$/.test(name);

/**
 * 文案の「〇〇社」に入れる名前を作る。
 * - 「A」→「A社」
 * - 「A社」「株式会社A」「A株式会社」「一般社団法人A」「A財団」など、すでに会社・法人とわかる名前はそのまま
 * - 空なら null
 * @param {unknown} company
 * @returns {string|null}
 */
export function formatSponsorName(company) {
  if (typeof company !== 'string') return null;
  const name = company.trim();
  if (!name) return null;
  return hasOrgSuffix(name) ? name : `${name}社`;
}

/**
 * 「PR（広告）：この記事は{company}社の依頼を受けて制作しました。」
 * 会社名が無いときは null（呼び出し側でフォールバック）。
 * @param {unknown} company
 */
export function ARTICLE_SPONSORED_TEXT(company) {
  const name = formatSponsorName(company);
  return name ? `PR（広告）：この記事は${name}の依頼を受けて制作しました。` : null;
}

/**
 * 「PR（広告）：この記事は{company}社から商品の提供を受けて作成しました。」
 * 会社名が無いときは null（呼び出し側でフォールバック）。
 * @param {unknown} company
 */
export function ARTICLE_PROVIDED_TEXT(company) {
  const name = formatSponsorName(company);
  return name ? `PR（広告）：この記事は${name}から商品の提供を受けて作成しました。` : null;
}

// 依頼・提供なのに会社名が未入力のときの最低限の表記（文案の冒頭部分のみ）。
export const ARTICLE_PR_FALLBACK_TEXT = 'PR（広告）';

// ── アフィリエイトリンクの自動判定 ──────────────
// 主な ASP のドメイン。ホスト名がこのドメイン自身か、そのサブドメインなら該当とみなす。
// 例: px.a8.net / af.moshimo.com / ck.jp.ap.valuecommerce.com / h.accesstrade.net /
//     t.afi-b.com / click.linksynergy.com / hb.afl.rakuten.co.jp / ad.presco.asia
export const AFFILIATE_DOMAINS = [
  'a8.net',
  'moshimo.com',
  'valuecommerce.com',
  'accesstrade.net',
  'afi-b.com',
  'felmat.net',
  'rentracks.jp',
  'linksynergy.com',
  'afl.rakuten.co.jp',
  'amzn.to',
  'presco.asia',
  'tcs-asp.net',
];

// tag= パラメータ付きのときだけアフィリエイトとみなすドメイン（Amazon アソシエイト）。
export const AFFILIATE_TAG_PARAM_DOMAINS = ['amazon.co.jp', 'amazon.com'];

const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

/**
 * 1つの URL がアフィリエイトリンクかどうか。
 * @param {string} rawUrl
 * @returns {boolean}
 */
export function isAffiliateUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  let url;
  try {
    const value = rawUrl.trim();
    url = new URL(value.startsWith('//') ? `https:${value}` : value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (AFFILIATE_DOMAINS.some((d) => hostMatches(host, d))) return true;
  if (AFFILIATE_TAG_PARAM_DOMAINS.some((d) => hostMatches(host, d))) {
    return Boolean(url.searchParams.get('tag'));
  }
  return false;
}

const URL_IN_TEXT = /(?:https?:)?\/\/[^\s"'<>()（）「」、。]+/gi;

/**
 * Portable Text・文字列・オブジェクトを再帰的にたどり、href と本文中の URL を集める。
 * @param {unknown} value
 * @param {string[]} [out]
 * @param {number} [depth]
 * @returns {string[]}
 */
export function collectUrls(value, out = [], depth = 0) {
  if (depth > 12 || value == null) return out;
  if (typeof value === 'string') {
    const found = value.match(URL_IN_TEXT);
    if (found) out.push(...found);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out, depth + 1);
    return out;
  }
  if (typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      // Portable Text の link 注釈などは href にスキーム無しで入ることがあるため、そのまま候補にする
      if (key === 'href' && typeof v === 'string') out.push(v);
      else collectUrls(v, out, depth + 1);
    }
  }
  return out;
}

/**
 * 本文などにアフィリエイトリンクが含まれるか。
 * @param {unknown} content
 */
export function containsAffiliateLink(content) {
  return collectUrls(content).some(isAffiliateUrl);
}

// 記事のうち、リンクを探す項目（クイズ記事のスキーマに合わせる）
export const ARTICLE_LINK_FIELDS = [
  'body',
  'problemDescription',
  'hint',
  'hints',
  'answerExplanation',
  'closingMessage',
];

export const AD_DISCLOSURE_TYPES = ['none', 'affiliate', 'sponsored', 'provided'];

/**
 * 記事に出す広告表記を決める。出さないときは null。
 * 1. 記事のフラグ adDisclosure（sponsored / provided / affiliate / none）を優先
 * 2. フラグが無い（未設定）ときだけ、本文リンクの自動判定でアフィリエイト表記
 *    （フラグが 'none' のときは自動判定もしない＝編集側で明示的に「なし」とした扱い）
 * @param {Record<string, any>|null|undefined} doc
 * @returns {{ type: 'affiliate'|'sponsored'|'provided', text: string, source: 'flag'|'auto' }|null}
 */
export function resolveArticleAdDisclosure(doc) {
  if (!doc || typeof doc !== 'object') return null;
  const flag = typeof doc.adDisclosure === 'string' ? doc.adDisclosure.trim() : '';

  if (flag === 'sponsored') {
    return {
      type: 'sponsored',
      text: ARTICLE_SPONSORED_TEXT(doc.sponsorName) ?? ARTICLE_PR_FALLBACK_TEXT,
      source: 'flag',
    };
  }
  if (flag === 'provided') {
    return {
      type: 'provided',
      text: ARTICLE_PROVIDED_TEXT(doc.sponsorName) ?? ARTICLE_PR_FALLBACK_TEXT,
      source: 'flag',
    };
  }
  if (flag === 'affiliate') {
    return { type: 'affiliate', text: ARTICLE_AFFILIATE_TEXT, source: 'flag' };
  }
  if (flag === 'none') return null;

  const hasAffiliate = ARTICLE_LINK_FIELDS.some((key) => containsAffiliateLink(doc[key]));
  return hasAffiliate ? { type: 'affiliate', text: ARTICLE_AFFILIATE_TEXT, source: 'auto' } : null;
}
