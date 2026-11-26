const arithmeticCategorySlugs = new Set(['math-quiz', 'arithmetic-quiz']);
const calculationOrderTitle =
  /計算の順[番序]|かっこ|カッコ|括弧|ど(?:れ|ちら|っち)を先に計算|(?:何|どこ)から計算/;

export function isArithmeticQuiz({ category, quizType }) {
  return arithmeticCategorySlugs.has(category?.slug) && (quizType == null || quizType === 'arithmetic');
}

export function selectArithmeticLinks(quiz, candidates) {
  if (!isArithmeticQuiz(quiz)) return [];

  const links = candidates
    .filter(({ slug }) => slug !== quiz.slug)
    .map(({ title, slug }) => ({ title, slug, category: quiz.category }));

  if (calculationOrderTitle.test(quiz.title)) {
    const sameType = links.filter(({ title }) => calculationOrderTitle.test(title));
    if (sameType.length >= 3) return sameType.slice(0, 5);
    const fallback = links.filter(({ title }) => !calculationOrderTitle.test(title));
    return [...sameType, ...fallback].slice(0, 5);
  }

  return links.slice(0, 5);
}
