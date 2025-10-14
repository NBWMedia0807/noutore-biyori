#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import { evaluateQuizOrdering } from '../tests/playwright/quiz-order.logic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runWithPlaywrightCli = () =>
  new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['playwright', 'test'], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(0);
      } else {
        reject(new Error(`Playwright CLI exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });

const ensureSnapshot = async (snapshotContent) => {
  const snapshotsDir = path.resolve(__dirname, '../tests/playwright/__snapshots__/quiz-order.spec.mjs');
  const snapshotPath = path.join(snapshotsDir, 'quiz-order.json');
  await fs.mkdir(snapshotsDir, { recursive: true });

  const actual = `${JSON.stringify(snapshotContent, null, 2)}\n`;

  try {
    const expected = await fs.readFile(snapshotPath, 'utf8');
    if (expected !== actual) {
      if (process.env.UPDATE_PLAYWRIGHT_SNAPSHOTS === '1') {
        await fs.writeFile(snapshotPath, actual, 'utf8');
        console.warn('[playwright-fallback] Snapshot updated');
        return;
      }
      throw new Error('Snapshot mismatch detected');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(snapshotPath, actual, 'utf8');
      console.warn('[playwright-fallback] Snapshot file created');
      return;
    }
    throw error;
  }
};

const runFallback = async () => {
  const { snapshot, slugs, topSlug, shouldRestrictToPublishedContent, sortedLength } =
    await evaluateQuizOrdering();

  if (sortedLength <= 0) {
    throw new Error('クイズの並び順検証で0件が返されました');
  }

  if (shouldRestrictToPublishedContent) {
    if (slugs.includes('future-sample')) {
      throw new Error('未来公開クイズが本番モードで混入しています');
    }
  } else if (topSlug !== 'future-sample') {
    throw new Error('プレビューモードで未来クイズが先頭になっていません');
  }

  await ensureSnapshot(snapshot);
  console.log('[playwright-fallback] Assertions completed without Playwright CLI');
};

const main = async () => {
  let hasPlaywright = false;
  try {
    await import('@playwright/test');
    hasPlaywright = true;
  } catch (error) {
    hasPlaywright = false;
  }

  if (hasPlaywright) {
    await runWithPlaywrightCli();
    return;
  }

  await runFallback();
};

main().catch((error) => {
  console.error('[run-playwright-tests] failed', error);
  process.exit(1);
});
