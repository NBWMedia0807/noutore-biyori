import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectArithmeticLinks } from '../src/lib/utils/arithmeticLinks.js';

const quiz = {
  slug: 'arithmetic-quiz/503',
  title: '計算の順番はわかる？',
  category: { slug: 'math-quiz', title: '計算クイズ' },
  quizType: 'arithmetic'
};
const addition = { slug: 'arithmetic-quiz/502', title: '暗算で足し算' };
const brackets = { slug: 'arithmetic-quiz/501', title: 'かっこのある式' };
const order = { slug: 'arithmetic-quiz/500', title: 'どれを先に計算する？' };
const parentheses = { slug: 'arithmetic-quiz/499', title: '括弧を含む式' };

for (const slug of ['math-quiz', 'arithmetic-quiz']) {
  test(`${slug} の計算クイズにリンクを返す`, () => {
    const category = { ...quiz.category, slug };
    assert.deepEqual(selectArithmeticLinks({ ...quiz, category }, [addition]), [
      { ...addition, category }
    ]);
  });
}

test('表示中のクイズを除き、同型を優先して候補順に並べる', () => {
  const links = selectArithmeticLinks(quiz, [addition, brackets, quiz, order, parentheses]);
  assert.deepEqual(links.map(({ slug }) => slug), [brackets.slug, order.slug, parentheses.slug]);
});

test('同型が3件未満なら他の型で補い、最大5件にする', () => {
  const other = Array.from({ length: 5 }, (_, index) => ({
    slug: `arithmetic-quiz/${490 + index}`,
    title: '引き算に挑戦'
  }));
  const links = selectArithmeticLinks(quiz, [addition, ...other, brackets]);
  assert.deepEqual(links.map(({ slug }) => slug), [
    brackets.slug,
    addition.slug,
    ...other.slice(0, 3).map(({ slug }) => slug)
  ]);
});

test('候補がなければ空配列を返す', () => {
  assert.deepEqual(selectArithmeticLinks(quiz, []), []);
});

test('計算カテゴリ以外、または別の quizType なら空配列を返す', () => {
  const category = { slug: 'anagram-quiz' };
  assert.deepEqual(selectArithmeticLinks({ ...quiz, category }, [addition]), []);
  assert.deepEqual(selectArithmeticLinks({ ...quiz, quizType: 'anagram' }, [addition]), []);
});
