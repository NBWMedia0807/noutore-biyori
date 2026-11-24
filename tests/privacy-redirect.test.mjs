// tests/privacy-redirect.test.mjs
//
// 旧URL /privacy → /privacy-policy の 308 リダイレクト（src/routes/privacy/+page.server.js）。
// SvelteKit を起動せず load を直接呼ぶ。
//
//   node --import ./tests/helpers/register-kit-alias.mjs --test tests/privacy-redirect.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRedirect } from '@sveltejs/kit';

import { load } from '../src/routes/privacy/+page.server.js';
import { resolvePrivacyRedirect } from '../src/lib/server/privacy-redirect.js';

// SvelteKit のサーバー load と同じく、hash を読むと例外になる URL を作る
const serverUrl = (href) =>
  new Proxy(new URL(href), {
    get(target, prop) {
      if (prop === 'hash') {
        throw new Error(
          'Cannot access event.url.hash. Consider using `page.url.hash` inside a component instead'
        );
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

const runLoad = (href) => {
  try {
    load({ url: serverUrl(href) });
  } catch (error) {
    return error;
  }
  assert.fail('load はリダイレクトを投げるはず');
};

test('/privacy は /privacy-policy へ 308（hash を読まない＝500 にならない）', () => {
  const error = runLoad('https://noutorebiyori.com/privacy');
  assert.ok(isRedirect(error), `Redirect ではない: ${error}`);
  assert.equal(error.status, 308);
  assert.equal(error.location, '/privacy-policy');
});

test('クエリは保持する', () => {
  const error = runLoad('https://noutorebiyori.com/privacy?utm_source=x&a=1');
  assert.ok(isRedirect(error));
  assert.equal(error.status, 308);
  assert.equal(error.location, '/privacy-policy?utm_source=x&a=1');
});

test('/privacy/ でも転送先はスラッシュなし（trailingSlash=never で二重リダイレクトしない）', () => {
  assert.equal(
    resolvePrivacyRedirect(new URL('https://noutorebiyori.com/privacy/')),
    '/privacy-policy'
  );
  assert.equal(
    resolvePrivacyRedirect(new URL('https://noutorebiyori.com/privacy/?q=1')),
    '/privacy-policy?q=1'
  );
});
