// src/lib/rss/feedSlots.js
//
// SmartNews / ママテナ / イチオシ 共通フィード（/feed/smartnews）の30枠を、
// マッチ棒クイズと他カテゴリにどう配分するかを決める。
//
// SvelteKit 固有の import を持たない純粋なモジュールにしてあるため、
// tests/ からそのまま import して検証できる（$lib/rss/gunosyFeed.js と同じ方針）。
//
// ── なぜ必要になったか ──────────────────────────────────────
// 以前の実装は GROQ の並び替えで「マッチ棒を先頭に寄せてから上位30件」を取っていた。
// マッチ棒は1日5本生成＋毎日2本を再公開していて在庫が常に30本を超えるため、
// 30枠すべてがマッチ棒で埋まり、他カテゴリが構造的に1本も配信されない状態だった。
// 2026-09 の GA4 実測でも、配信の93%がマッチ棒に集中していた。
//
// 「マッチ棒が本当に強いのか」「他カテゴリなら通用するのか」は、
// 他カテゴリを一度も配信していない状態では判定しようがない。
// そこで他カテゴリにも最低1枠ずつ回し、比較できる状態を作る。
//
// ── 枠の配分 ────────────────────────────────────────────────
//   1〜10位  : マッチ棒（最新10本 ≒ 2日分）
//   11〜18位 : 他カテゴリの最新1本ずつ（最大8枠）
//   19〜30位 : マッチ棒（残り12本）
//
// 探索枠を末尾ではなく中ほどに置くのは、配信先が「上位N件のみ取り込む」挙動だった
// 場合でも探索枠が捨てられないようにするため（元の実装のコメントにあった懸念）。
// 先頭はマッチ棒で押さえてあるので、どちらの仕様でも損をしない。
//
// ── 安全側の設計 ────────────────────────────────────────────
//   - 生成が止まったカテゴリ（time-quiz / money-quiz など）の古い記事が
//     混ざらないよう、直近 FRESHNESS_DAYS 日以内に記事があるカテゴリにだけ枠を配る。
//   - 枠が余ったら必ず埋める（配信本数を減らさない）。
//     他カテゴリが足りなければマッチ棒で、マッチ棒が足りなければ他カテゴリで補充する。
//   - カテゴリが無い記事（_type: 'post' のコラム等）はカテゴリ枠の対象外。
//     従来も配信されていなかったため、挙動を変えない。

/** フィードの総枠数。従来と同じ30件を維持する。 */
export const MAX_ITEMS = 30;

/** 先頭に置くマッチ棒の本数（最新10本 ≒ 2日分）。 */
export const LEAD_MATCHSTICK_ITEMS = 10;

/** 1カテゴリに配る枠数。 */
export const SLOTS_PER_CATEGORY = 1;

/** カテゴリ枠の上限。カテゴリが増えてもマッチ棒の枠を削りすぎないための歯止め。 */
export const MAX_CATEGORY_SLOTS = 8;

/** このカテゴリに枠を配るかの判定に使う鮮度（日）。生成が止まったカテゴリを除外する。 */
export const FRESHNESS_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 記事の公開日時（ミリ秒）。取れなければ NaN。 */
const publishedAtMs = (article) => {
  const value = article?.publishedAt || article?._createdAt;
  const ms = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(ms) ? ms : Number.NaN;
};

/** カテゴリ枠のキー。カテゴリが無い記事は枠の対象外（null を返す）。 */
const categoryKey = (article) => {
  const slug = article?.category?.slug;
  return typeof slug === 'string' && slug !== '' ? slug : null;
};

/** 公開日の新しい順。同じ日時なら元の順序を保つ。 */
const byPublishedDesc = (a, b) => {
  const av = publishedAtMs(a);
  const bv = publishedAtMs(b);
  if (!Number.isFinite(av) && !Number.isFinite(bv)) return 0;
  if (!Number.isFinite(av)) return 1;
  if (!Number.isFinite(bv)) return -1;
  return bv - av;
};

/**
 * 同じスラッグの記事（再公開などでドキュメントが重なるケース）を最新の1件に寄せる。
 * item.link が同一URLを指して重複するのを防ぐ。
 *
 * @param {Array<object>} articles 公開日の新しい順に並んだ記事
 * @param {(article: object) => void} [onDuplicate] 重複を捨てたときの通知（ログ用）
 */
export const dedupeBySlug = (articles, onDuplicate) => {
  const seen = new Set();
  return (Array.isArray(articles) ? articles : []).filter((article) => {
    if (!article?.slug) return false;
    if (seen.has(article.slug)) {
      if (typeof onDuplicate === 'function') onDuplicate(article);
      return false;
    }
    seen.add(article.slug);
    return true;
  });
};

/**
 * カテゴリごとに「直近 freshnessDays 日以内の最新記事」を slotsPerCategory 件ずつ拾う。
 * 生成が止まったカテゴリは新しい記事が無いので自然に外れる。
 */
const pickCategorySlots = (others, { nowMs, freshnessDays, slotsPerCategory, maxSlots }) => {
  const threshold = nowMs - freshnessDays * DAY_MS;
  const picked = new Map();

  for (const article of [...others].sort(byPublishedDesc)) {
    const key = categoryKey(article);
    if (!key) continue;
    const at = publishedAtMs(article);
    if (!Number.isFinite(at) || at < threshold) continue;

    const bucket = picked.get(key) ?? [];
    if (bucket.length >= slotsPerCategory) continue;
    bucket.push(article);
    picked.set(key, bucket);
  }

  // カテゴリをまたいで公開日の新しい順に並べる（新しいカテゴリの記事が上に来る）
  return [...picked.values()].flat().sort(byPublishedDesc).slice(0, maxSlots);
};

/**
 * フィードに載せる30件を選び、配信順に並べて返す。
 *
 * @param {object} input
 * @param {Array<object>} input.matchstick マッチ棒クイズの候補（公開日の新しい順）
 * @param {Array<object>} input.others マッチ棒以外の候補（公開日の新しい順）
 * @param {object} [options]
 * @param {Date} [options.now] 鮮度判定の基準時刻（テスト用）
 * @param {number} [options.maxItems]
 * @param {number} [options.leadMatchstickItems]
 * @param {number} [options.slotsPerCategory]
 * @param {number} [options.maxCategorySlots]
 * @param {number} [options.freshnessDays]
 * @returns {Array<object>} 配信順に並んだ記事（最大 maxItems 件）
 */
export const selectSmartnewsItems = ({ matchstick = [], others = [] } = {}, options = {}) => {
  const {
    now = new Date(),
    maxItems = MAX_ITEMS,
    leadMatchstickItems = LEAD_MATCHSTICK_ITEMS,
    slotsPerCategory = SLOTS_PER_CATEGORY,
    maxCategorySlots = MAX_CATEGORY_SLOTS,
    freshnessDays = FRESHNESS_DAYS,
  } = options;

  const nowMs = now instanceof Date ? now.getTime() : Date.now();
  const matchstickPool = dedupeBySlug([...matchstick].sort(byPublishedDesc));
  const othersPool = dedupeBySlug([...others].sort(byPublishedDesc));

  // カテゴリ枠は、先頭のマッチ棒を確保したうえで残る枠数を超えない
  const categorySlotLimit = Math.max(0, Math.min(maxCategorySlots, maxItems - leadMatchstickItems));
  const explore = pickCategorySlots(othersPool, {
    nowMs,
    freshnessDays,
    slotsPerCategory,
    maxSlots: categorySlotLimit,
  });
  const lead = matchstickPool.slice(0, leadMatchstickItems);
  const tailCount = Math.max(0, maxItems - lead.length - explore.length);
  const tail = matchstickPool.slice(lead.length, lead.length + tailCount);

  const selected = [...lead, ...explore, ...tail];

  // 枠が余ったら埋める。配信本数を減らさないことを優先する。
  //   例: マッチ棒が22本に満たない → 他カテゴリの2本目以降で補充
  //       カテゴリが8個に満たない → マッチ棒で補充（tail が長くなる形で既に吸収済み）
  if (selected.length < maxItems) {
    const used = new Set(selected.map((article) => article.slug));
    const fillers = [...matchstickPool, ...othersPool]
      .filter((article) => !used.has(article.slug))
      .sort(byPublishedDesc);
    for (const article of fillers) {
      if (selected.length >= maxItems) break;
      used.add(article.slug);
      selected.push(article);
    }
  }

  return selected.slice(0, maxItems);
};
