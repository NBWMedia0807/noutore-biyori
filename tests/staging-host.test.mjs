// tests/staging-host.test.mjs
// *.workers.dev の noindex / robots / AdSense 無効化。pnpm run test:edge-cache に含む。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGING_ROBOTS_TAG,
  STAGING_ROBOTS_TXT,
  applyWorkersDevRobots,
  isWorkersDevHost,
  stripStagingAdNetworkHints
} from '../src/lib/staging-host.js';

test('isWorkersDevHost: workers.dev とそのサブドメインだけ', () => {
  assert.equal(isWorkersDevHost('noutore-biyori-staging.workers.dev'), true);
  assert.equal(isWorkersDevHost('foo.bar.workers.dev'), true);
  assert.equal(isWorkersDevHost('workers.dev'), true);
  assert.equal(isWorkersDevHost('Noutore-Biyori-Staging.Workers.Dev.'), true);
  assert.equal(isWorkersDevHost('noutorebiyori.com'), false);
  assert.equal(isWorkersDevHost('www.noutorebiyori.com'), false);
  assert.equal(isWorkersDevHost('noutore-biyori.vercel.app'), false);
  assert.equal(isWorkersDevHost('localhost'), false);
  assert.equal(isWorkersDevHost('notworkers.dev'), false);
  assert.equal(isWorkersDevHost('workers.dev.evil.example'), false);
  assert.equal(isWorkersDevHost(''), false);
  assert.equal(isWorkersDevHost(undefined), false);
});

test('applyWorkersDevRobots: 試験ホストだけ X-Robots-Tag: noindex', () => {
  const staging = applyWorkersDevRobots(new Response('ok'), 'noutore-biyori-staging.workers.dev');
  assert.equal(staging.headers.get('x-robots-tag'), STAGING_ROBOTS_TAG);

  const prod = applyWorkersDevRobots(new Response('ok'), 'noutorebiyori.com');
  assert.equal(prod.headers.get('x-robots-tag'), null);

  const local = applyWorkersDevRobots(new Response('ok'), 'localhost');
  assert.equal(local.headers.get('x-robots-tag'), null);
});

test('STAGING_ROBOTS_TXT は全拒否で、Sitemap を含まない', () => {
  assert.match(STAGING_ROBOTS_TXT, /Disallow:\s*\//);
  assert.doesNotMatch(STAGING_ROBOTS_TXT, /Sitemap:/i);
  assert.doesNotMatch(STAGING_ROBOTS_TXT, /Allow:\s*\//);
});

test('stripStagingAdNetworkHints: 広告の事前接続を外し、ins と本文は残す', () => {
  const html = `<!DOCTYPE html><html><head>
  <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin />
  <link rel="dns-prefetch" href="//googleads.g.doubleclick.net" />
  <link rel="preload" href="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2298313897414846" as="script" />
  <link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
  <link rel="preload" href="/logo.svg" as="image" />
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2298313897414846" crossorigin="anonymous"></script>
  </head><body>
  <ins class="adsbygoogle" data-ad-client="ca-pub-2298313897414846" data-ad-slot="1"></ins>
  <p>記事</p>
  </body></html>`;

  const out = stripStagingAdNetworkHints(html);
  assert.doesNotMatch(out, /rel="preconnect"[^>]*googlesyndication/);
  assert.doesNotMatch(out, /doubleclick/);
  assert.doesNotMatch(out, /<link[^>]*adsbygoogle/);
  assert.match(out, /cdn\.sanity\.io/);
  assert.match(out, /\/logo\.svg/);
  assert.match(out, /data-adsense-staging="withheld"/);
  assert.match(out, /data-src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-/);
  assert.doesNotMatch(out, /<script[^>]*\ssrc="https:\/\/pagead2\.googlesyndication\.com/);
  assert.match(out, /<ins class="adsbygoogle"/);
  assert.match(out, /ca-pub-2298313897414846/);
  assert.match(out, /<p>記事<\/p>/);
});
