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
  - `SANITY_WRITE_TOKEN` または `SANITY_AUTH_TOKEN`（ドキュメント作成/更新などの書き込み時に使用）

`.env.local.example` に例を記載しています。`SANITY_API_VERSION` はコードからも参照され、未設定の場合は `2024-01-01` が使用されます。

注意事項
- ブラウザ側コードではトークンを使用しません（露出させないでください）。
- サーバー側/スクリプトでのみ `SANITY_READ_TOKEN`/`SANITY_WRITE_TOKEN` を利用します。

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
- `SANITY_WRITE_TOKEN`（または `SANITY_AUTH_TOKEN`）

CLI 例:

```bash
gh secret set SANITY_PROJECT_ID -b "$SANITY_PROJECT_ID"
gh secret set SANITY_DATASET -b "$SANITY_DATASET"
gh secret set SANITY_API_VERSION -b "2024-01-01"
gh secret set SANITY_READ_TOKEN -b "$SANITY_READ_TOKEN"
gh secret set SANITY_WRITE_TOKEN -b "$SANITY_WRITE_TOKEN"
```

## デプロイ運用

### Vercel（SvelteKit フロントエンド）

- ビルドコマンドは `pnpm run build`（内部で `svelte-kit build` のみを実行）です。Sanity Studio のビルド処理は含めていません。
- ルートディレクトリをプロジェクトのルートに指定し、出力ディレクトリはデフォルトの `.svelte-kit` / `build` を利用してください。
- 必要な環境変数（`VITE_SANITY_PROJECT_ID`、`VITE_SANITY_DATASET` など）は Vercel の Project Settings > Environment Variables に登録します。
- デプロイ後のログは Vercel の Deployments 画面から確認できます（例: `https://vercel.com/<team>/<project>/<deployment>`）。

### Sanity Studio（Sanity Hosting）

- Studio 側の依存関係をインストール後、以下でデプロイします。

```bash
pnpm -C studio exec sanity deploy
```

- デプロイ前に Sanity プロジェクト設定から本番ドメインを CORS の許可リストへ追加してください。
- デプロイが完了するとホスティング URL が表示されます（例: `https://<project-id>.sanity.studio/`）。
- Vercel の本番サイトと相互に通信する場合、必要に応じて追加の CORS 設定を行ってください。
