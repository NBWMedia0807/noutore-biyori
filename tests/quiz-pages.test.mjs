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

  const { response } = await fetchWithLog('/health/quiz/slugs');
  if (!response.ok) {
    throw new Error(`/health/quiz/slugs responded with ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload.slugs) || payload.slugs.length < 2) {
    throw new Error('Health endpoint returned less than 2 quiz slugs');
  }
  return payload.slugs.slice(0, 2);
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

test('quiz detail and answer pages respond with 200', async () => {
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

    await verifyResponse(`/quiz/${encodeURIComponent(slug)}`, `/quiz/${slug}`);
    await verifyResponse(`/quiz/${encodeURIComponent(slug)}/answer`, `/quiz/${slug}/answer`);
  }
});

test('diagnostic API echoes Sanity document', async () => {
  const slugs = await resolveSlugs();
  const sampleSlug = slugs[0];
  const { response } = await fetchWithLog(`/api/debug/sanity?slug=${encodeURIComponent(sampleSlug)}`);
  assert.strictEqual(response.status, 200, 'Diagnostic API should return 200 for an existing slug');
  const bodyText = await response.text();
  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch (err) {
    console.error('[diagnostic parse error]', { status: response.status, bodyText });
    throw err;
  }

  if ((process.env.ENABLE_QUIZ_STUB || '').toLowerCase() === '1') {
    console.log('[diagnostic payload]', payload);
  }

  try {
    assert.strictEqual(payload.hit, true, 'Diagnostic API should set hit=true');
    assert.strictEqual(payload.resolvedSlug, sampleSlug, 'Resolved slug should match the requested slug');
  } catch (err) {
    console.error('[diagnostic debug]', { status: response.status, payload });
    throw err;
  }
});
