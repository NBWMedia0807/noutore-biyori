// tests/merkystyle-feed.test.mjs
//
// Merkystyle RSS（/rss/merkystyle.xml）の item <description>（紹介文）のテスト。
// 紹介文は「問題文 + ヒント」だけで、答え・締め・タイトル末尾付与を含まないこと。
//
//   node --test tests/merkystyle-feed.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MERKYSTYLE_DESCRIPTION_LIMIT,
  buildMerkystyleDescription,
} from '../src/lib/rss/merkystyleDescription.js';

const ANSWER_PHRASES = [/答えは.*です/u, /正解は.*です/u, /正解の式の一例は/u, /正解の一例は/u];

const assertNoAnswer = (description) => {
  for (const pattern of ANSWER_PHRASES) {
    assert.doesNotMatch(description, pattern);
  }
};

// 本番フィード（2026-11-23 10:56 JST 取得）の実例をもとにしたサンプル
const CASES = [
  {
    title: '【アナグラム】場所にまつわる言葉 文字をバラバラにしました！',
    problemDescription:
      '毎日の移動に欠かせないもの。 街中で誰もが目にする存在です。 バラバラにされた文字を並べ替えて、元の言葉を当ててみましょう。',
    hints: '人々が目的地へ向かうために利用する施設や乗り物の総称です。 駅や停留所、空港など、様々な形態で存在します。',
    answerExplanation:
      '答えは「こうつうきかん」です。 人や物を運ぶために、社会の中で重要な役割を果たしている乗り物や施設全般を指す言葉です。 電車やバスが代表的です。',
    closingMessage: 'また次回の問題もお楽しみに！',
    expected:
      '毎日の移動に欠かせないもの。 街中で誰もが目にする存在です。 バラバラにされた文字を並べ替えて、元の言葉を当ててみましょう。 人々が目的地へ向かうために利用する施設や乗り物の総称です。 駅や停留所、空港など、様々な形態で存在します。',
  },
  {
    title: '【アナグラム】暮らしの中で必要な数字を並べ替えて何の言葉？',
    problemDescription:
      '毎日の連絡に欠かせない情報が、文字をバラバラにされてしまいました。 個人を識別するための数字の列として、私たちの日常生活で重要な役割を果たしています。',
    hints: '友人に連絡を取りたいときや、お店に予約を入れるときに必要な情報です。 複数の数字を組み合わせた形で、相手を特定するために使われます。',
    answerExplanation: '答えは「でんわばんごう」です。 これは、個人や企業を識別するために割り当てられた番号です。',
    closingMessage: '楽しんでいただけましたか？',
    expected:
      '毎日の連絡に欠かせない情報が、文字をバラバラにされてしまいました。 個人を識別するための数字の列として、私たちの日常生活で重要な役割を果たしています。 友人に連絡を取りたいときや、お店に予約を入れるときに必要な情報です。 複数の数字を組み合わせた形で、相手を特定するために使われます。',
  },
  {
    title: '【二字熟語クロスワード】正・満・末・給に共通する一文字は？',
    problemDescription:
      'カレンダーを見るたびに目にする、時間を表す重要な単位。 この漢字は、私たちの生活のリズムを刻む中心的な役割を担っています。',
    hints:
      '新年の始まりや、夜空に浮かぶ満ちた姿、給与の支払い周期、そして暦の区切りなど、暮らしの中で何度も顔を出す存在です。 夜間の空を照らす天体とも深く結びついています。',
    answerExplanation: '答えは「月」です。 この漢字は、夜空に浮かぶ天体を表すとともに、時間の単位も表します。',
    closingMessage: 'また明日も挑戦してください。',
    expected:
      'カレンダーを見るたびに目にする、時間を表す重要な単位。 この漢字は、私たちの生活のリズムを刻む中心的な役割を担っています。 新年の始まりや、夜空に浮かぶ満ちた姿、給与の支払い周期、そして暦の区切りなど、暮らしの中で何度も顔を出す存在です。 夜間の空を照らす天体とも深く結びついています。',
  },
  {
    title: '【数式パズル】実は簡単？難しい？3・7・7・8で25を作ろう！',
    problemDescription:
      '3・7・7・8の4つの数字を使って、答えが25になる式を作ってみましょう。 四則演算（＋・－・×・÷）と括弧を自由に使い、すべての数字をちょうど1回ずつ使うのがルールです。',
    hints:
      'まずは足し算だけで合計がいくつになるか確認してみましょう。 4つの数字の合計と目標の数を比べると、どの演算を使えばよいかが見えてきます。',
    answerExplanation: '正解の式の一例は（（３＋７）＋７）＋８です。 ほかにも正解の一例はいくつかあります。',
    closingMessage: '次の数式パズルもお楽しみに！',
    expected:
      '3・7・7・8の4つの数字を使って、答えが25になる式を作ってみましょう。 四則演算（＋・－・×・÷）と括弧を自由に使い、すべての数字をちょうど1回ずつ使うのがルールです。 まずは足し算だけで合計がいくつになるか確認してみましょう。 4つの数字の合計と目標の数を比べると、どの演算を使えばよいかが見えてきます。',
  },
];

for (const sample of CASES) {
  test(`紹介文は問題+ヒントのみ: ${sample.title}`, () => {
    const description = buildMerkystyleDescription(sample);
    assert.equal(description, sample.expected);
    assertNoAnswer(description);
    assert.ok(!description.includes(sample.answerExplanation.split(' ')[0]));
    assert.ok(!description.includes(sample.closingMessage));
    // 180字未満でもタイトルを末尾に足さない
    assert.ok(description.length < MERKYSTYLE_DESCRIPTION_LIMIT);
    assert.ok(!description.includes(sample.title));
  });
}

test('問題文の目標値の説明（答えが25になる）は残す', () => {
  const description = buildMerkystyleDescription(CASES[3]);
  assert.match(description, /答えが25になる式を作ってみましょう。/u);
  assert.doesNotMatch(description, /（３＋７）/u);
});

test('入力の title は変更されない', () => {
  const sample = { ...CASES[0] };
  const before = sample.title;
  buildMerkystyleDescription(sample);
  assert.equal(sample.title, before);
});

test('問題文とヒントがあるときは本文 body を使わない', () => {
  const description = buildMerkystyleDescription({
    ...CASES[0],
    body: '本文の導入です。答えは「こうつうきかん」です。',
  });
  assert.equal(description, CASES[0].expected);
});

test('問題文もヒントも空なら本文を使い、答えの文は落とす', () => {
  const description = buildMerkystyleDescription({
    title: 'タイトル',
    body: 'マッチ棒を1本動かして正しい式にしてください。 答えは「6+3=9」です。 正解は1通りです。',
  });
  assert.equal(description, 'マッチ棒を1本動かして正しい式にしてください。');
});

test('問題・ヒント・本文がすべて空のときだけタイトルにフォールバック', () => {
  assert.equal(buildMerkystyleDescription({ title: '【脳トレ】タイトル' }), '【脳トレ】タイトル');
  assert.equal(
    buildMerkystyleDescription({ title: '【脳トレ】タイトル', body: '答えは「月」です。' }),
    '【脳トレ】タイトル'
  );
  assert.equal(buildMerkystyleDescription({}), '');
});

test('重複文の除去と180字切りは従来どおり', () => {
  const sentence = 'あいうえおかきくけこさしすせそたちつてと。';
  const description = buildMerkystyleDescription({
    problemDescription: `${sentence} ${sentence}`,
    hints: Array.from({ length: 12 }, (_, i) => `ヒント${i}番目の文章をここに書きます。`).join(' '),
  });
  assert.equal(description.split(sentence).length - 1, 1);
  assert.ok(description.length <= MERKYSTYLE_DESCRIPTION_LIMIT);
  assert.ok(description.endsWith('…'));
});

test('merkystyle ルートは解答・締めを紹介文に渡していない', () => {
  const source = readFileSync(
    new URL('../src/routes/rss/merkystyle.xml/+server.ts', import.meta.url),
    'utf8'
  );
  const call = source.match(/buildMerkystyleDescription\(\{[\s\S]*?\}\)/);
  assert.ok(call, 'buildMerkystyleDescription の呼び出しがない');
  assert.doesNotMatch(call[0], /answer|closing/i);
  assert.doesNotMatch(source, /plainAnswer|plainClosing/);
  // タイトルはそのまま item <title> に出す（加工しない）
  assert.match(source, /<title>\$\{escapeXml\(item\.title\)\}<\/title>/);
});
