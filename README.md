# noutore-biyori
脳トレ・クイズに特化したWebメディア「脳トレ日和」のフロントエンド（HTML/CSS）リポジトリです。

## セットアップ

```bash
# 環境変数ファイルを作成
cp .env.local.example .env.local

# 依存関係をインストール
pnpm install

# 開発サーバーを起動
pnpm dev
```

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
