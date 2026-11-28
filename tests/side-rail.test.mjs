import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIDE_RAIL_SLOT, FEED_AD_SLOTS } from '../src/lib/config/ads.js';

test('サイドレールには既存スロットと異なる専用の10桁IDを使う', () => {
  assert.equal(SIDE_RAIL_SLOT, '2110613730');
  assert.match(SIDE_RAIL_SLOT, /^\d{10}$/);
  assert.ok(![
    ...FEED_AD_SLOTS, '5756190566', '4170928887', '5428887502', '3921249196', '1724332823'
  ].includes(SIDE_RAIL_SLOT));
});
