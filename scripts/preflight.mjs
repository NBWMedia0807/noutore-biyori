#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PREFIX = '[preflight]';

const requiredEnv = ['SANITY_PROJECT_ID', 'SANITY_DATASET', 'SANITY_API_VERSION'];
const missing = requiredEnv.filter((key) => {
  const value = process.env[key];
  return value === undefined || value === '';
});

if (missing.length > 0) {
  console.error(`${PREFIX} ❌ 必須環境変数が未設定です: ${missing.join(', ')}`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const schemaDir = path.join(repoRoot, 'studio', 'schemas');
const strayPattern = /^sanity\..*\.(?:[cm]?js|[cm]?ts|jsx|tsx)$/u;

if (existsSync(schemaDir)) {
  const strayFiles = readdirSync(schemaDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => strayPattern.test(name));

  if (strayFiles.length > 0) {
    console.error(
      `${PREFIX} ❌ studio/schemas 内で Sanity の設定ファイルと思われる迷子ファイルを検出しました: ${strayFiles.join(', ')}`
    );
    process.exit(1);
  }
}

try {
  const result = execSync('git clean -fdX -n', {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim();

  if (result.length > 0) {
    console.warn(`${PREFIX} ⚠️ git clean -fdX -n の結果、削除対象となるファイルが見つかりました:\n${result}`);
  } else {
    console.warn(`${PREFIX} ⚠️ git clean -fdX -n の結果、削除対象はありません。`);
  }
} catch (error) {
  console.warn(`${PREFIX} ⚠️ git clean -fdX -n の実行に失敗しました: ${error.message}`);
}

// スラッグ重複の監視（別内容が同一スラッグを共有 / 空スラッグ を検出したら失敗）
// ※ 読み取りトークン未設定やネットワーク失敗時はスクリプト側でスキップ（exit 0）する。
try {
  execSync('node scripts/check-duplicate-slugs.mjs', {
    cwd: repoRoot,
    stdio: 'inherit'
  });
} catch (error) {
  console.error(`${PREFIX} ❌ スラッグ重複チェックで致命的な重複が検出されました。`);
  process.exit(1);
}

console.info(`${PREFIX} ✅ OK`);
