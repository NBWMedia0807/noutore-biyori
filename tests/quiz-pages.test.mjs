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
  if (!devServer || devServer.exitCode !== null) {
    return;
  }

  const waitForExit = () =>
    devServer.exitCode !== null ? Promise.resolve() : once(devServer, 'exit');

  const sendSignal = (signal) => {
    if (devServerGroupPid !== null) {
      try {
        process.kill(-devServerGroupPid, signal);
      } catch (err) {
        serverLogs.push(`[dev] failed to send group ${signal}: ${err.message}`);
      }
    }

    try {
      devServer.kill(signal);
    } catch (err) {
      if (err?.code !== 'ESRCH') {
        serverLogs.push(`[dev] failed to send ${signal}: ${err.message}`);
      }
    }
  };

  const requestStop = async (signal, timeoutMs) => {
    if (devServer.exitCode !== null) {
      return true;
    }

    sendSignal(signal);

    if (devServer.exitCode !== null) {
      return true;
    }

    const result = await Promise.race([
      waitForExit().then(() => 'exited'),
      delay(timeoutMs).then(() => 'timeout')
    ]);

    return result === 'exited';
  };

  try {
    for (const { signal, timeout } of [
      { signal: 'SIGINT', timeout: 3000 },
      { signal: 'SIGTERM', timeout: 2000 }
    ]) {
      const exited = await requestStop(signal, timeout);
      if (exited) {
        return;
      }
    }

    if (devServer.exitCode === null) {
      serverLogs.push('[dev] forcing SIGKILL after timeout');
      sendSignal('SIGKILL');
      await waitForExit();
    }
  } catch (err) {
    serverLogs.push(`[dev] failed to exit cleanly: ${err.message}`);
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

