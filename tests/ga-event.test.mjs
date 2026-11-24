import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';

test('sendEvent adds site metadata and only sends on a measured hostname', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { $lib: new URL('../src/lib', import.meta.url).pathname } },
    server: { middlewareMode: true, ws: false, watch: null },
  });
  const measurementId = 'G-TEST';
  vite.config.env.VITE_GA_ID = measurementId;
  const calls = [];
  const originalWindow = globalThis.window;

  try {
    const { sendEvent } = await vite.ssrLoadModule('/src/lib/ga.ts');
    const params = {
      next_quiz_slug: 'next',
      category_slug: 'matchstick',
      source: 'answer_page',
    };
    globalThis.window = {
      location: { hostname: 'localhost' },
      gtag: (...args) => calls.push(args),
    };
    sendEvent('next_challenge_click', params);
    assert.equal(calls.length, 0);

    window.location.hostname = 'noutorebiyori.com';
    sendEvent('next_challenge_click', params);
    assert.deepEqual(calls, [
      [
        'event',
        'next_challenge_click',
        {
          ...params,
          content_surface: 'website',
          app_webview: 'browser',
          send_to: measurementId,
          transport_type: 'beacon',
        },
      ],
    ]);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    await vite.close();
  }
});
