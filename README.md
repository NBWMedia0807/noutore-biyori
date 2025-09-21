# noutore-biyori
脳トレ・クイズに特化したWebメディア「脳トレ日和」のフロントエンド（HTML/CSS）リポジトリです。

## セットアップ

### 環境変数ファイルの作成

```bash
cp .env.local.example .env.local
```

### 依存関係のインストール

```bash
# ルートの依存関係をインストール
pnpm install

# Sanity Studio 側の依存関係もインストール
pnpm --dir studio install
```

Codespaces や Dev Container で開いた場合は、`.devcontainer/devcontainer.json` の `postCreateCommand` により `pnpm run postcreate` が実行され、上記のインストール処理が自動で行われます。ローカルでの初回セットアップ時に手動でまとめて行う場合は以下を実行してください。

```bash
pnpm run postcreate
```

## 開発サーバーの起動

以下のコマンドで SvelteKit（ポート 5173）と Sanity Studio（ポート 3333）が同時に立ち上がります。

```bash
pnpm dev
```

必要に応じて片方だけ起動したい場合は次のコマンドを利用できます。

```bash
pnpm run dev:web     # SvelteKit のみ起動
pnpm run dev:studio  # Sanity Studio のみ起動
```

開発サーバー起動前に `scripts/preflight.mjs` が実行され、必須環境変数と Git 作業ツリーの状態、Sanity 関連の迷子ファイルをチェックします。エラー内容を解消した上で再度コマンドを実行してください。

### 環境変数について

- `.env.local` に Sanity 用の環境変数を設定してください。
  - `SANITY_PROJECT_ID`
  - `SANITY_DATASET`
  - `SANITY_API_VERSION`（必須。デフォルトは `2024-01-01`）
  - `SANITY_READ_TOKEN`（非公開データの読み取り時に使用）
  - `SANITY_WRITE_TOKEN`（ドキュメント作成/更新などの書き込み時に使用）
  - `SANITY_AUTH_TOKEN` または `SANITY_DEPLOY_TOKEN`（Studio の自動デプロイで使用）
  - `SANITY_API_TOKEN`（任意。上記が未設定の場合のフォールバックとして利用）

`.env.local.example` に例を記載しています。`SANITY_API_VERSION` はコードからも参照され、未設定の場合は `2024-01-01` が使用されます。

注意事項
- ブラウザ側コードではトークンを使用しません（露出させないでください）。
- サーバー側/スクリプトでのみ `SANITY_READ_TOKEN`/`SANITY_WRITE_TOKEN`（必要に応じて `SANITY_AUTH_TOKEN` / `SANITY_DEPLOY_TOKEN` / `SANITY_API_TOKEN` を使用）を利用します。
- `SANITY_READ_TOKEN` が未設定の環境では `SANITY_WRITE_TOKEN` → `SANITY_AUTH_TOKEN` → `SANITY_DEPLOY_TOKEN` → `SANITY_API_TOKEN` の順に自動フォールバックします。読み取り専用の権限を利用したい場合は `SANITY_READ_TOKEN` を各環境に設定してください。

## Sanity 連携（安全なAPIアクセス）

- クライアント構成はすべて環境変数を参照する形に統一されています。
- ブラウザ用（公開）: `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET` を参照（トークンは不使用）
- サーバー/スクリプト用（非公開）: `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_VERSION`, `SANITY_READ_TOKEN`, `SANITY_WRITE_TOKEN`

### 動作確認用スクリプト

- 読み取りテスト: `node -r dotenv/config scripts/query.mjs`
- 書き込みテスト: `node -r dotenv/config scripts/mutate.mjs`

`.env.local` に必要な値が設定されていることが前提です。`dotenv` を使わない場合は、シェルから環境変数をエクスポートして実行してください。

### GitHub Secrets の設定（推奨）

GitHub Actions を使う場合、以下のシークレットをリポジトリの `Settings > Secrets and variables > Actions` に登録してください（値は本READMEに記載しないこと）。

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION`（例: `2024-01-01`）
- `SANITY_READ_TOKEN`
- `SANITY_WRITE_TOKEN`
- `SANITY_AUTH_TOKEN`（または `SANITY_DEPLOY_TOKEN`）
- `SANITY_API_TOKEN`

CLI 例:

```bash
gh secret set SANITY_PROJECT_ID -b "$SANITY_PROJECT_ID"
gh secret set SANITY_DATASET -b "$SANITY_DATASET"
gh secret set SANITY_API_VERSION -b "2024-01-01"
gh secret set SANITY_READ_TOKEN -b "$SANITY_READ_TOKEN"
gh secret set SANITY_WRITE_TOKEN -b "$SANITY_WRITE_TOKEN"
gh secret set SANITY_AUTH_TOKEN -b "$SANITY_AUTH_TOKEN"
gh secret set SANITY_DEPLOY_TOKEN -b "$SANITY_DEPLOY_TOKEN"
gh secret set SANITY_API_TOKEN -b "$SANITY_API_TOKEN"
```

## デプロイ運用

### Vercel（SvelteKit フロントエンド）

- ビルドコマンドは `pnpm run build`（内部で `svelte-kit build` のみを実行）です。Sanity Studio のビルド処理は含めていません。
- ルートディレクトリをプロジェクトのルートに指定し、出力ディレクトリはデフォルトの `.svelte-kit` / `build` を利用してください。
- 必要な環境変数（`VITE_SANITY_PROJECT_ID`、`VITE_SANITY_DATASET`、`SANITY_READ_TOKEN` など）は Vercel の Project Settings > Environment Variables に登録します。
- デプロイ後のログは Vercel の Deployments 画面から確認できます（例: `https://vercel.com/<team>/<project>/<deployment>`）。

### Sanity Studio（Sanity Hosting）

- Studio 側の依存関係をインストール後、以下の順番でデプロイします。

- `SANITY_AUTH_TOKEN` / `SANITY_DEPLOY_TOKEN` / `SANITY_API_TOKEN` のいずれかを環境変数として設定した状態で、リポジトリ直下から以下を実行します。

```bash
SANITY_AUTH_TOKEN="<Deploy Studio token>" node scripts/deploy-sanity-studio.mjs
```

- スクリプトは `studio/sanity.config.js` の `projectId: quljge22` / `dataset: production` / `studioHost: noutore-biyori-studio-main` を検証し、
  これらが異なる場合は即座に失敗します。想定と一致した場合のみ `sanity schema deploy` → `sanity deploy` を順番に実行します。
- デプロイ前に Sanity プロジェクト設定から本番ドメインを CORS の許可リストへ追加してください。
- デプロイが完了するとホスティング URL が表示されます（例: `https://<project-id>.sanity.studio/`）。
- Vercel の本番サイトと相互に通信する場合、必要に応じて追加の CORS 設定を行ってください。

#### GitHub Actions による自動デプロイ

- `main` ブランチへのプッシュ、または手動トリガー（`workflow_dispatch`）で `.github/workflows/deploy-sanity.yml` が実行され、Sanity Studio が自動的に再デプロイされます。
- ワークフロー内では `corepack` を使って `pnpm@10.15.0` を有効化し、`studio` ディレクトリの依存関係を `pnpm install --frozen-lockfile` で再現したうえで `node scripts/deploy-sanity-studio.mjs` を実行します。
  スクリプト側で `projectId` / `dataset` / `studioHost` の整合性チェックと `sanity schema deploy` → `sanity deploy` の順次実行を行うため、
  想定外のホストや誤ったプロジェクトへデプロイされることを防ぎます。ロックファイルに未反映の変更があると失敗するため、事前に `pnpm --dir studio install` をローカルで実行して差分をコミットしてください。
- リポジトリの Secrets には `SANITY_AUTH_TOKEN` または `SANITY_DEPLOY_TOKEN`（必要であれば `SANITY_API_TOKEN`）を登録してください。Sanity の [Manage project tokens](https://www.sanity.io/manage) から **Deploy Studio (Token only)** 権限のトークンを発行し、`Settings > Secrets and variables > Actions > New repository secret` で保存します。シークレットが未設定の場合はログに「Sanity deploy token is not configured …」と表示されます。ワークフローは設定済みのトークンを環境変数へ展開し、追加の `sanity login` ステップなしで非対話デプロイを実行します。
- ワークフローでは `sanity.config.js` / `sanity.cli.js` に定義した `projectId: quljge22` / `dataset: production` / `studioHost: noutore-biyori-studio-main` をスクリプト内で検証します。
- デプロイ完了後はログに `Sanity Studio を https://noutore-biyori-studio-main.sanity.studio/ へデプロイしました。` が出力されます。ホスト名は `studio/sanity.config.js` の `studioHost` を参照しているため、ログにこの行が出ていれば設定どおりのホストへ配信されています。
- 念のため手動で確認する場合は、Sanity Studio のホスティング URL（例: `https://noutore-biyori-studio-main.sanity.studio/`）を開き、スキーマの更新内容（フィールド追加/変更など）が反映されているか確認してください。ブラウザキャッシュが残っている場合はハードリロードやクエリ文字列を付与して再読み込みしてください。
- 詳細な手順やトラブルシューティングは [docs/sanity-deploy.md](docs/sanity-deploy.md) にまとめています。必要に応じて参照してください。
