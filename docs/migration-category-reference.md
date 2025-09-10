# Category を reference 型に統一する移行手順

フロントエンドと Sanity Studio の両方を、`quiz.category` を reference 型（`to: [{type: 'category'}]`）に統一しました。既存データが文字列の場合は、以下の手順で移行してください。

## 1. 前提

- Sanity の Write 権限トークン（`SANITY_AUTH_TOKEN`）を用意
- プロジェクトID、データセット名を確認（例: `quljge22` / `production`）

## 2. 依存のインストール

```
pnpm install
```

## 3. 移行スクリプトの実行

下記の環境変数を設定し、スクリプトを実行します。

```
export SANITY_PROJECT_ID=quljge22
export SANITY_DATASET=production
export SANITY_AUTH_TOKEN=***your_write_token***
node scripts/migrate-category-to-reference.mjs
```

スクリプトは以下を行います。
- 文字列の `quiz.category` を持つドキュメントを抽出
- 文字列タイトルをもとに `category` ドキュメントを作成/再利用
- `quiz.category` を該当 `category` への reference に置換

## 4. フロントエンドの動作確認

開発サーバーを起動して、一覧・詳細・カテゴリページが表示されることを確認します。

```
pnpm dev
```

## 5. 注意事項（セキュリティ）

- `.env` に書かれているトークンは公開リポジトリにコミットしないでください。
- すでにコミット済みのトークンは無効化・ローテーションしてください。

