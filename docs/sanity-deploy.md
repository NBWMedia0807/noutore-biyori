# Sanity Studio デプロイ運用ガイド

Sanity Studio のスキーマを GitHub 上のコードから確実に反映させるための運用手順をまとめています。Studio のホストは固定で `noutore-biyori-studio-main` を使用し、プロジェクト ID は `quljge22`、dataset は `production` です。

## 本番サイト連携チェックリスト

本番の SvelteKit アプリが Sanity の記事を正しく取得できない場合は、以下の 4 点を確認してください。

1. **環境変数**: `.env.local` と Vercel の環境変数で `SANITY_PROJECT_ID` / `SANITY_DATASET` / `SANITY_API_VERSION` が設定されているか。ブラウザ向けの `VITE_SANITY_*` も同じ値に揃えます。
2. **コード側の設定**: `studio/sanity.config.js` / `studio/sanity.cli.js` / `src/lib/sanity*.js` がすべて同じ projectId (`quljge22`) と dataset (`production`) を参照しているか。`src/lib/sanityDefaults.js` が単一の真実のソースです。
3. **Sanity CORS**: [Sanity Manage project](https://www.sanity.io/manage) で `https://noutorebiyori.com` とプレビュー用ドメインが CORS Origins に登録されており、`Allow credentials` は無効化されているか。
4. **API Token**: プレビューやドラフト表示が必要な場合は `SANITY_READ_TOKEN` と `SANITY_PREVIEW_DRAFTS=true`（もしくは `SANITY_PREVIEW=true`）を設定します。

> いずれかが不足すると `src/lib/sanity.server.js` の警告ログに表示されます。ステージング環境でも同じリストで確認できます。

## トークン管理

1. Sanity の **Manage project tokens** でロール **Deploy Studio (Token only)** を選択し、新しいトークンを発行します。
2. 発行後に表示されるトークン値を以下の GitHub Secrets に登録します（少なくとも 1 つ）。
   - `SANITY_AUTH_TOKEN`
   - `SANITY_DEPLOY_TOKEN`
   - `SANITY_API_TOKEN`（任意。Deploy 用トークンが使えない場合のフォールバック）
3. 既存のトークンが失効している可能性がある場合は再発行して Secrets を更新します。Secrets は後から参照できないため、更新時は必ず値を控えてから保存してください。

> `SANITY_READ_TOKEN` / `SANITY_WRITE_TOKEN` も従来どおり必要です。サーバーサイドからの読み書きやプレビュー機能で利用し、Studio デプロイ時には自動的にフォールバックされます。

## 自動デプロイ（GitHub Actions）

- ワークフロー名: **Deploy Sanity schema** (`.github/workflows/deploy-sanity.yml`)
- トリガー条件:
  - `main` ブランチへのプッシュ（Studio 配下のファイル更新時）
  - 手動実行（`workflow_dispatch`）
- 主なステップ:
  1. `corepack` で `pnpm@10.15.0` を有効化
  2. `studio/` ディレクトリの依存関係を `pnpm install --frozen-lockfile` で再現
  3. トークンが最低 1 つ設定されているかチェック
  4. `node scripts/deploy-sanity-studio.mjs` を実行して `sanity schema deploy` → `sanity deploy` を自動実行

### 実行ログで確認できること

- スクリプト冒頭で `workspace`, `projectId`, `dataset`, `studioHost`, `token`（使用した環境変数名）が表示されます。
- 最後に `Sanity Studio を https://noutore-biyori-studio-main.sanity.studio/ へデプロイしました。` が出力されれば成功です。
- トークンが未設定の場合は `Sanity deploy token is not configured …` で失敗します。

## 手動デプロイ

Secrets を更新した直後やトークンの切り替えを確認したい場合は、ローカルまたは GitHub Actions の手動実行で以下を実施します。

```bash
# 例: 手元で Deploy Studio トークンを使って実行する場合
SANITY_AUTH_TOKEN="<Deploy Studio token>" node scripts/deploy-sanity-studio.mjs
```

複数の環境変数を同時に設定している場合は、スクリプトが `SANITY_AUTH_TOKEN` → `SANITY_DEPLOY_TOKEN` → `SANITY_API_TOKEN` → `SANITY_WRITE_TOKEN` の順で自動的に選択します。使用された環境変数名はログに表示されます。

## 反映確認の手順

1. GitHub Actions の最新の Run を開き、`Deploy Sanity Studio from repo config` ステップが成功しているか確認します。
2. `https://noutore-biyori-studio-main.sanity.studio/` を開き、`schemas/` 以下の変更（例: `quiz.js` のフィールド構成）が反映されているかを確認します。
3. ブラウザキャッシュの影響を避けるため、ハードリロードまたは `?t=<timestamp>` を付けたアクセスを推奨します。

## トラブルシューティング

| 症状 | 考えられる原因 | 対処方法 |
| ---- | ---------------- | -------- |
| Actions が 401/403 で失敗 | トークンの権限不足・失効 | Sanity でトークンを再発行し、`SANITY_AUTH_TOKEN` か `SANITY_DEPLOY_TOKEN` を Secrets に再登録する |
| ログでホスト URL が確認できない | Sanity CLI v4 以降は URL を再掲しない仕様 | スクリプトが出力する `Sanity Studio を ...` の行でホストを確認する |
| Studio 側でスキーマが古い | 別ホストへ誤ってデプロイ | `sanity.config.js` と `sanity.cli.js` の `studioHost` が `noutore-biyori-studio-main` になっているか確認する |
| スキーマ差分が反映されない | ブラウザキャッシュ | ハードリロードまたは別ブラウザでアクセスする |
| ローカルから `pnpm exec sanity` が失敗 | `pnpm`/依存関係が未インストール | `pnpm install` と `pnpm --dir studio install` を実行してから再試行する |

## 参考リンク

- [Sanity Manage project tokens](https://www.sanity.io/manage)
- [Sanity CLI - Deploying your studio](https://www.sanity.io/docs/sanity-cli)
- [`scripts/deploy-sanity-studio.mjs`](../scripts/deploy-sanity-studio.mjs)
