// src/lib/utils/slug.js

const unique = (values) => {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

const safeDecode = (value) => {
  if (typeof value !== 'string') return '';
  try {
    return decodeURIComponent(value);
  } catch (err) {
    return value;
  }
};

export const createSlugCandidates = (value) => {
  if (!value) return [];

  const decoded = safeDecode(value);
  const normalized = decoded.normalize('NFKC');
  const collapsedWhitespace = normalized.replace(/[\u3000\s]+/g, '-');
  const collapsedHyphen = collapsedWhitespace.replace(/-+/g, '-');
  const withoutDelimiters = normalized.replace(/[\u3000\s_-]+/g, '');

  return unique([
    value,
    decoded,
    normalized,
    collapsedWhitespace,
    collapsedHyphen,
    withoutDelimiters,
    normalized.toLowerCase(),
    collapsedWhitespace.toLowerCase(),
    collapsedHyphen.toLowerCase(),
    withoutDelimiters.toLowerCase()
  ]);
};

export const createSlugQueryPayload = (value) => {
  const candidates = createSlugCandidates(value);
  const lowerCandidates = unique(candidates.map((entry) => entry.toLowerCase()));
  return { candidates, lowerCandidates };
};

export const mergeSlugCandidateLists = (...lists) => {
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    if (!list) continue;
    for (const value of list) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      merged.push(trimmed);
    }
  }
  return merged;
};
