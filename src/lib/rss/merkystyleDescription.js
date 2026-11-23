// src/lib/rss/merkystyleDescription.js
// Merkystyle RSS（/rss/merkystyle.xml）の item <description>（紹介文）の組み立て。
// Sanity・SvelteKit に依存しない純粋関数（テスト用に分離）。
//
// 紹介文は「問題文 + ヒント」だけにする（NOBU 決定 2026-11-23：RSS紹介文に答えを入れない）。
// - answerExplanation（解答）と closingMessage（締め）は入れない。
// - 本文 body は、問題文もヒントも空のときだけ使う。その場合も答えの文は落とす。
// - タイトルは、問題・ヒント・本文がすべて空のときだけのフォールバック（末尾に足さない）。
// 解答・締めは content:encoded 側に残る（今回は対象外）。

export const MERKYSTYLE_DESCRIPTION_LIMIT = 180;

// 本文フォールバック時に落とす「解答の文」。
// 「答えが25になる式を作ってみましょう」のような問題文の目標値は対象外（「答えは」「正解は」だけ）。
const ANSWER_SENTENCE_PATTERNS = [/答えは/u, /正解は/u, /正解の式の一例は/u, /正解の一例は/u];

const compactWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toText = (value) => (typeof value === 'string' ? value : '');

const splitSentences = (text) =>
  text
    .split(/(?<=[。！？!?])/u)
    .map((fragment) => compactWhitespace(fragment))
    .filter(Boolean);

const dedupeFragments = (text) => {
  const seen = new Set();
  const unique = [];
  for (const fragment of splitSentences(text)) {
    const key = fragment.replace(/[\s。、,.!?！？]/gu, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(fragment);
  }
  return unique;
};

export const isAnswerSentence = (sentence) =>
  ANSWER_SENTENCE_PATTERNS.some((pattern) => pattern.test(sentence));

const stripAnswerSentences = (text) =>
  splitSentences(text)
    .filter((sentence) => !isAnswerSentence(sentence))
    .join(' ');

const truncate = (text, limit) => {
  if (text.length <= limit) return text;
  const sliced = text.slice(0, limit - 1);
  const trimmed = sliced.replace(/[\s、。,.!?！？]+$/u, '') || sliced;
  return `${trimmed}…`;
};

/**
 * @param {{ problemDescription?: string, hints?: string, body?: string, title?: string }} parts
 *   それぞれプレーンテキスト化済みの値（portableTextToPlain 済み）
 * @returns {string}
 */
export const buildMerkystyleDescription = ({ problemDescription, hints, body, title } = {}) => {
  let candidates = [toText(problemDescription), toText(hints)].filter((v) => v.trim());
  if (candidates.length === 0) {
    const safeBody = stripAnswerSentences(compactWhitespace(toText(body)));
    if (safeBody) candidates = [safeBody];
  }
  const fallbackTitle = compactWhitespace(toText(title));
  if (candidates.length === 0) {
    return fallbackTitle ? truncate(fallbackTitle, MERKYSTYLE_DESCRIPTION_LIMIT) : '';
  }

  const normalized = compactWhitespace(candidates.join(' '));
  const fragments = dedupeFragments(normalized);
  const merged = fragments.length > 0 ? fragments.join(' ') : normalized;
  // 先頭がタイトルの繰り返しなら外す（従来どおり）。
  const withoutTitle = fallbackTitle
    ? merged.replace(new RegExp(`^${escapeRegExp(fallbackTitle)}\\s*`, 'u'), '')
    : merged;
  const cleaned = compactWhitespace(withoutTitle || merged);
  return truncate(cleaned, MERKYSTYLE_DESCRIPTION_LIMIT);
};
