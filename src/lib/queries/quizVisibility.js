// src/lib/queries/quizVisibility.js
import { previewDraftsEnabled } from '$lib/sanity.server.js';
import {
  ensurePublishedAt,
  isFutureScheduled,
  resolvePublishInfo,
  resolvePublishedDate
} from '$lib/utils/publishedDate.js';

export { resolvePublishedDate, isFutureScheduled } from '$lib/utils/publishedDate.js';

export const shouldRestrictToPublishedContent = !previewDraftsEnabled;

export const QUIZ_PUBLISHED_FIELD = 'coalesce(publishedAt, _createdAt)';

/**
 * 公開してよい記事だけを通す条件（先頭に && を持たない素の式）。
 *
 * 「retracted を除外する」拒否リストではなく「approved だけを通す」許可リストにしている。
 * これにより needs_review（監査待ち）も自動的に非公開となり、将来ステータスを
 * 追加したときも既定で安全側（出さない）に倒れる。
 *
 * reviewStatus 未設定の既存記事は "approved" とみなす（coalesce で既定値を与える）。
 * GROQ では null との比較結果が直感に反する場合があるため、必ず coalesce を挟む。
 */
export const QUIZ_NOT_RETRACTED_CONDITION = /* groq */ `coalesce(reviewStatus, "approved") == "approved"`;

/**
 * 公開審査フィルタ。プレビュー（ドラフト表示）の有無に関わらず**常に**適用する。
 *
 * 是正対象の記事は編集者向けプレビューであっても公開経路に出してはならない。
 * 内容の確認は Sanity Studio 上で行う。
 */
export const QUIZ_RETRACTED_FILTER = `
  && ${QUIZ_NOT_RETRACTED_CONDITION}`;

/**
 * 本文に「null」が表示される（生成バグ）記事を除外するフィルタ。
 * 例：「11からnullは差が5」「6+7+null=15」のように、数値が埋まらず "null" が残ったもの。
 * ※ Sanity 側の本文を修正すれば該当しなくなり、自動的に復帰する（self-healing）。
 *
 * 以前は SmartNews フィード専用だったが、サイト本体・sitemap・他フィードにも
 * 適用するため、共通の可視性判定としてここへ集約した。
 */
export const EXCLUDE_NULL_TEXT_FILTER = /* groq */ `!(
  pt::text(problemDescription) match "*null*" ||
  pt::text(hints) match "*null*" ||
  pt::text(answerExplanation) match "*null*" ||
  pt::text(closingMessage) match "*null*" ||
  pt::text(body) match "*null*"
)`;

export const QUIZ_PUBLISHED_FILTER =
  (shouldRestrictToPublishedContent
    ? `
  && !(_id in path("drafts.**"))
  && defined(${QUIZ_PUBLISHED_FIELD})
  && ${QUIZ_PUBLISHED_FIELD} <= now()`
    : '') + QUIZ_RETRACTED_FILTER;

/**
 * 外部配信フィード（SmartNews / Merkystyle / TRILL）向けの最も厳しいゲート。
 * 公開判定＋非公開化除外に加えて、本文の生成バグ記事も落とす。
 */
export const QUIZ_FEED_SAFE_FILTER = `${QUIZ_PUBLISHED_FILTER}
  && ${EXCLUDE_NULL_TEXT_FILTER}`;

/**
 * スラッグから「存在するが非公開化されている」記事を引くクエリ。
 * 詳細ページで 404 と 410 Gone を出し分けるために使う。
 */
export const QUIZ_RETRACTED_LOOKUP = /* groq */ `*[
  _type == "quiz"
  && slug.current == $slug
  && !(_id in path("drafts.**"))
  && coalesce(reviewStatus, "approved") == "retracted"
][0]{ _id, retractedReason }`;

export const QUIZ_ORDER_BY_PUBLISHED = `${QUIZ_PUBLISHED_FIELD} desc`;

/**
 * 閉鎖されていないカテゴリだけを通す条件（先頭に && を持たない素の式）。
 * quiz と同じく「approved だけを通す」許可リスト方式。
 */
export const CATEGORY_NOT_RETRACTED_CONDITION = /* groq */ `coalesce(reviewStatus, "approved") == "approved"`;

/**
 * カテゴリ用フィルタ。閉鎖判定はプレビューの有無に関わらず常に適用する。
 * これを通ることで、グローバルナビ・メニュー・sitemap・カテゴリ一覧から
 * 閉鎖カテゴリが一括で消える。
 */
export const CATEGORY_DRAFT_FILTER =
  (shouldRestrictToPublishedContent
    ? `
  && !(_id in path("drafts.**"))`
    : '') +
  `
  && ${CATEGORY_NOT_RETRACTED_CONDITION}`;

/**
 * スラッグから「存在するが閉鎖されている」カテゴリを引くクエリ。
 * カテゴリページで 404 と 410 Gone を出し分けるために使う。
 */
export const CATEGORY_RETRACTED_LOOKUP = /* groq */ `*[
  _type == "category"
  && slug.current == $slug
  && !(_id in path("drafts.**"))
  && coalesce(reviewStatus, "approved") == "retracted"
][0]{ _id, title, retractedReason }`;

const toSlugString = (quiz) => {
  if (!quiz) return '';
  if (typeof quiz.slug === 'string') return quiz.slug.trim();
  const slugCandidate = quiz.slug?.current ?? quiz.slug?._ref ?? '';
  return typeof slugCandidate === 'string' ? slugCandidate.trim() : '';
};

export const filterVisibleQuizzes = (items) => {
  if (!Array.isArray(items)) return [];

  const now = Date.now();

  return items.reduce((acc, originalQuiz) => {
    const slug = toSlugString(originalQuiz);
    if (!slug) return acc;

    // 公開可でない記事はここでも落とす。クエリ側の除外が漏れた場合の最終防波堤。
    // （reviewStatus を select していないクエリでは undefined になり、素通りする）
    const reviewStatus = originalQuiz?.reviewStatus;
    if (reviewStatus != null && reviewStatus !== 'approved') return acc;

    const baseQuiz =
      slug && typeof originalQuiz.slug !== 'string' ? { ...originalQuiz, slug } : originalQuiz;

    const context = originalQuiz?._id ?? slug;
    const { iso, timestamp } = resolvePublishInfo(baseQuiz, context);

    if (!iso || Number.isNaN(timestamp)) {
      return acc;
    }

    if (shouldRestrictToPublishedContent && timestamp > now) {
      return acc;
    }

    acc.push(ensurePublishedAt(baseQuiz, context));
    return acc;
  }, []);
};

export const ensureArray = (value) => (Array.isArray(value) ? value : []);
