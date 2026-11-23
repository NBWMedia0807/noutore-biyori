import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/lib/components/AdSense.svelte'),
  'utf8'
);

const match = source.match(/function pushAd\(\) \{[\s\S]*?\n  \}\n\n  function startPolling/);
if (!match) {
  throw new Error('AdSense.svelte から pushAd() を取り出せませんでした');
}
const pushAdFn = match[0].replace(/\n\n  function startPolling$/, '');

function runPushAd({ isConnected = true, adsbygoogleStatus = undefined, pushedPath = '', currentPath = '/quiz/a', destroyed = false, allowed = true } = {}) {
  let pushes = 0;
  let polls = 0;
  const adRef = {
    isConnected,
    hasAttribute: (name) => name === 'data-adsbygoogle-status' && adsbygoogleStatus != null && adsbygoogleStatus !== '',
    dataset: { adsbygoogleStatus }
  };
  const state = {
    adRef,
    destroyed,
    currentPath,
    pushedPath,
    adPushed: false,
    adsenseRequestsAllowed: () => allowed,
    startPolling: () => {
      polls += 1;
    },
    window: {
      adsbygoogle: {
        push: () => {
          pushes += 1;
        }
      }
    }
  };
  const result = runInNewContext(`${pushAdFn}\npushAd()`, state);
  return { result, pushes, polls, pushedPath: state.pushedPath, adPushed: state.adPushed };
}

test('未処理の ins は push してポーリングを始める', () => {
  const out = runPushAd();
  assert.equal(out.result, true);
  assert.equal(out.pushes, 1);
  assert.equal(out.polls, 1);
  assert.equal(out.adPushed, true);
  assert.equal(out.pushedPath, '/quiz/a');
});

test('他スロットの push で処理済みの ins は再 push せず、ポーリングだけ始める（枠を表示する）', () => {
  const out = runPushAd({ adsbygoogleStatus: 'done' });
  assert.equal(out.result, true);
  assert.equal(out.pushes, 0);
  assert.equal(out.polls, 1);
  assert.equal(out.adPushed, true);
  assert.equal(out.pushedPath, '/quiz/a');
});

test('DOM から外れた ins は何もしない', () => {
  const out = runPushAd({ isConnected: false, adsbygoogleStatus: 'done' });
  assert.equal(out.result, false);
  assert.equal(out.pushes, 0);
  assert.equal(out.polls, 0);
  assert.equal(out.adPushed, false);
  assert.equal(out.pushedPath, '');
});

test('同じパスでは二重 push も二重ポーリングもしない', () => {
  const out = runPushAd({ pushedPath: '/quiz/a' });
  assert.equal(out.result, false);
  assert.equal(out.pushes, 0);
  assert.equal(out.polls, 0);
});
