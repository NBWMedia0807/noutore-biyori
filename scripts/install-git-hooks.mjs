#!/usr/bin/env node
import { chmodSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const huskyDir = resolve('.husky');

if (!existsSync(huskyDir)) {
  console.warn('[install-git-hooks] .husky ディレクトリが見つからないため処理をスキップします。');
  process.exit(0);
}

try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
} catch {
  console.warn('[install-git-hooks] Git リポジトリ外のためフック設定をスキップします。');
  process.exit(0);
}

try {
  execSync('git config core.hooksPath .husky', { stdio: 'inherit' });
  const preCommitPath = resolve(huskyDir, 'pre-commit');
  if (existsSync(preCommitPath)) {
    chmodSync(preCommitPath, 0o755);
  }
  console.log('[install-git-hooks] core.hooksPath を .husky に設定しました。');
} catch (error) {
  console.error('[install-git-hooks] Git フック設定に失敗しました。', error);
  process.exit(1);
}
