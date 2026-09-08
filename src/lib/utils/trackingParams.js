// クエリ文字列が「純粋なトラッキングパラメータだけ」かを判定する。
//
// ── なぜ必要か ──────────────────────────────────────────
// 以前は「クエリが1つでもあれば noindex」だった。
// ニュースアプリ配信からの流入は Referer が渡らず GA4 で (direct)/(none) に
// 落ちるため、配信元を識別する目的でフィードの記事URLへ UTM を付ける予定がある。
// そのとき着地した記事が丸ごと noindex になってしまうのを避ける。
//
// canonical はこれまで通りクエリを除いた記事URLを指すので、
// UTM 付きURLをインデックス可能にしても重複コンテンツにはならない。
//
// ── 判定を緩めすぎないための方針 ────────────────────────
// 対象は `utm_` で始まるキャンペーンパラメータ**だけ**。
// 検索・ページング・プレビュー・状態変更など、ページの内容が変わりうる
// クエリ（?page=2, ?q=..., ?preview=... など）は従来どおり noindex にする。
// 「クエリがあれば何でも index」には絶対にしない。

/**
 * `utm_` 接頭辞。
 *
 * Google のキャンペーンパラメータはこの接頭辞で統一されており
 * （utm_source / utm_medium / utm_campaign / utm_id / utm_term / utm_content /
 *   utm_source_platform / utm_creative_format / utm_marketing_tactic …）、
 * 今後 Google が新しい `utm_*` を増やしても、この接頭辞判定なら自動的に追従する。
 * ページの内容を変える用途で `utm_` を使うことはないため、接頭辞での一括判定は安全。
 */
const TRACKING_PARAM_PREFIX = 'utm_';

/**
 * 個別に許可するトラッキングパラメータ名。
 *
 * 現在は `utm_` 接頭辞ですべて賄えているため空。
 * 広告のクリックID（gclid / fbclid / msclkid など）を将来インデックス対象に
 * 含めたくなった場合は、ここへ明示的に追加する。
 * 接頭辞判定と違い、1件ずつ意図して足すこと。
 * @type {ReadonlySet<string>}
 */
const TRACKING_PARAM_NAMES = new Set([]);

/**
 * 1つのクエリパラメータ名が「純粋なトラッキング目的」かを判定する。
 *
 * 大文字小文字は区別しない（`UTM_SOURCE` のような表記ゆれで
 * noindex に転ぶのを防ぐ。いずれにせよ canonical はクエリ無しを指す）。
 *
 * @param {string} name クエリパラメータ名
 * @returns {boolean}
 */
export const isTrackingParam = (name) => {
  if (typeof name !== 'string' || name === '') return false;
  const normalized = name.toLowerCase();
  return normalized.startsWith(TRACKING_PARAM_PREFIX) || TRACKING_PARAM_NAMES.has(normalized);
};

/**
 * クエリ文字列が「1つ以上のパラメータを持ち、その全てがトラッキング目的」かを判定する。
 *
 * クエリが無い場合は false を返す（「トラッキングのみ」ではないため）。
 * noindex の判定には shouldNoindexForQuery() を使うこと。
 *
 * @param {string | null | undefined} search `?` を含んでも含まなくてもよいクエリ文字列
 * @returns {boolean}
 */
export const hasOnlyTrackingParams = (search) => {
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  if (query === '') return false;

  const params = new URLSearchParams(query);
  let sawParam = false;
  for (const name of params.keys()) {
    sawParam = true;
    if (!isTrackingParam(name)) return false;
  }
  return sawParam;
};

/**
 * クエリ文字列を理由に noindex にすべきかを判定する。
 *
 *   クエリ無し                          → false（index）
 *   UTM だけ                            → false（index。canonical はクエリ無しURL）
 *   トラッキング以外を1つでも含む       → true （noindex）
 *
 * @param {string | null | undefined} search `?` を含んでも含まなくてもよいクエリ文字列
 * @returns {boolean} true なら noindex にする
 */
export const shouldNoindexForQuery = (search) => {
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  if (query === '') return false;
  return !hasOnlyTrackingParams(query);
};
