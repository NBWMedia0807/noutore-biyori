import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_BASE_URL = 'http://localhost:5173';
const baseURL = process.env.QUIZ_BASE_URL || DEFAULT_BASE_URL;
const serverCommand = process.env.QUIZ_TEST_SERVER_COMMAND || 'pnpm';
const serverArgs = process.env.QUIZ_TEST_SERVER_ARGS
  ? process.env.QUIZ_TEST_SERVER_ARGS.split(' ').filter(Boolean)
  : ['dev', '--', '--host=localhost', '--port=5173'];

const KNOWN_SLUGS = (process.env.QUIZ_KNOWN_SLUGS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const serverLogs = [];
let devServer;
let devServerGroupPid = null;

const waitForServer = async (url, attempts = 60, intervalMs = 1000) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (devServer?.exitCode !== null) {
      throw new Error(`Dev server exited unexpectedly with code ${devServer.exitCode}`);
    }

    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (err) {
      serverLogs.push(`[waitForServer] attempt ${attempt + 1} failed: ${err.message}`);
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for dev server at ${url}`);
};

const fetchWithLog = async (path) => {
  const target = new URL(path, baseURL).toString();
  const response = await fetch(target, { redirect: 'manual' });

  let bodySnippet = '';
  try {
    const text = await response.clone().text();
    bodySnippet = text.slice(0, 160);
  } catch (err) {
    bodySnippet = `<unavailable: ${err?.message ?? 'unknown'}>`;
  }

  return { response, bodySnippet };
};

const resolveSlugs = async () => {
  if (KNOWN_SLUGS.length >= 2) {
    return KNOWN_SLUGS.slice(0, 2);
  }

  throw new Error(
    'テストには最低2つのクイズスラッグが必要です。QUIZ_KNOWN_SLUGS環境変数を設定してください。'
  );
};

before(async () => {
  if (process.env.QUIZ_TEST_SKIP_SERVER === '1') {
    return;
  }

  devServer = spawn(serverCommand, serverArgs, {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  devServerGroupPid = devServer.pid ?? null;

  if (devServer.stdout) {
    devServer.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      serverLogs.push(text.trim());
      process.stdout.write(`[dev] ${text}`);
    });
  }

  if (devServer.stderr) {
    devServer.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      serverLogs.push(text.trim());
      process.stderr.write(`[dev:err] ${text}`);
    });
  }

  devServer.on('exit', (code, signal) => {
    serverLogs.push(`[dev] exited with code=${code} signal=${signal}`);
    devServerGroupPid = null;
  });

  const healthUrl = new URL('/', baseURL).toString();
  await waitForServer(healthUrl);
});

after(async () => {
  if (devServer && devServer.exitCode === null) {
    if (devServerGroupPid !== null) {
      try {
        process.kill(-devServerGroupPid, 'SIGTERM');
      } catch (err) {
        serverLogs.push(`[dev] failed to send group SIGTERM: ${err.message}`);
      }
    }

    devServer.kill('SIGTERM');
    try {
      const waitForExit = () =>
        devServer.exitCode !== null ? Promise.resolve() : once(devServer, 'exit');

      await Promise.race([
        waitForExit(),
        (async () => {
          await delay(5000);
          if (devServer.exitCode === null) {
            serverLogs.push('[dev] forcing SIGKILL after timeout');
            if (devServerGroupPid !== null) {
              try {
                process.kill(-devServerGroupPid, 'SIGKILL');
              } catch (err) {
                serverLogs.push(`[dev] failed to send group SIGKILL: ${err.message}`);
              }
            }
            devServer.kill('SIGKILL');
            await waitForExit();
          }
        })()
      ]);
    } catch (err) {
      serverLogs.push(`[dev] failed to exit cleanly: ${err.message}`);
    }
  }
});

test('quiz detail and answer pages retain navigation and ad slots without follow buttons', async () => {
  const slugs = await resolveSlugs();
  assert.ok(slugs.length >= 2, 'At least two slugs are required for the smoke test');

  for (const slug of slugs) {
    const verifyResponse = async (path, label) => {
      const result = await fetchWithLog(path);
      if (result.response.status === 308) {
        const location = result.response.headers.get('location');
        assert.ok(location, `${label} should include Location header when redirecting`);
        const redirected = await fetchWithLog(location);
        assert.strictEqual(
          redirected.response.status,
          200,
          `Expected 200 for ${location} via ${label}, got ${redirected.response.status}`
        );
        return redirected;
      }

      assert.strictEqual(
        result.response.status,
        200,
        `Expected 200 for ${label}, got ${result.response.status}`
      );
      return result;
    };

    const questionPath = `/quiz/${encodeURIComponent(slug)}`;
    for (const [path, cta, slots] of [
      [questionPath, '正解ページへ進む', ['4170928887', '3921249196', '1724332823']],
      [`${questionPath}/answer`, '問題ページに戻る', ['4170928887', '3921249196', '5428887502', '1724332823']]
    ]) {
      const { response } = await verifyResponse(path, path);
      const html = await response.text();
      assert.doesNotMatch(html, /フォローする|SNSも毎日更新中/, path);
      const reservedAd = html.indexOf('data-ad-slot="4170928887"');
      assert.match(html, /<p class="ad-label[^"]*">広告<\/p>/, path);
      if (slug === 'sample-quiz-a') {
        const image = html.search(/<img[^>]+alt="(?:サンプルクイズAの問題イメージ|正解画像)"/);
        assert.ok(image >= 0 && image < reservedAd, `${path} should show the image before the ad`);
      }
      const secondAd = html.indexOf('data-ad-slot="3921249196"');
      const ctaSpacer = html.indexOf('class="cta-ad-spacer');
      assert.ok(ctaSpacer > html.lastIndexOf(cta) && secondAd > ctaSpacer, path);
      if (path === questionPath) {
        const mobileCta = html.indexOf('to-answer to-answer--mobile');
        assert.ok(mobileCta > reservedAd && mobileCta < secondAd, path);
        assert.equal([...html.matchAll(/正解ページへ進む/g)].length, 2, path);
      }
      assert.ok(html.includes(cta), `${path} should include ${cta}`);
      assert.deepEqual(
        [...html.matchAll(/data-ad-slot="([0-9]+)"/g)].map((match) => match[1]),
        slots,
        `${path} should retain its ad slots in order`
      );
    }
  }
});

test(
  'stub answer links to one next quiz in the same category after the explanation',
  {
    skip: !KNOWN_SLUGS.includes('sample-quiz-a'),
  },
  async () => {
    const { response } = await fetchWithLog('/quiz/sample-quiz-a/answer');
    assert.equal(response.status, 200);
    const html = await response.text();
    const challenge = html.indexOf('さらにもう一問！');
    const note = html.indexOf('※複数の正解');
    assert.ok(note >= 0 && challenge > note);
    assert.match(html.slice(challenge), /href="\/category\/sample-category\/sample-quiz-next"/);

    const { response: single } = await fetchWithLog('/quiz/sample-quiz-b/answer');
    assert.equal(single.status, 200);
    assert.doesNotMatch(await single.text(), /さらにもう一問！/);
  }
);
