# noutore-biyori
脳トレ・クイズに特化したWebメディア「脳トレ日和」のフロントエンド（HTML/CSS）リポジトリです。

## セットアップ

### 環境変数ファイルの作成

```bash
cp .env.local.example .env.local
```

### ローカルでクイズページを確認・撮影する際の注意

Sanity に接続できない環境では、クイズ記事のスラッグが解決できず 404 になる場合があります。ローカルで UI を確認したりスクリーンショットを撮影したりする際は、以下のようにスタブデータを有効化してください。

```bash
ENABLE_QUIZ_STUB=1 SKIP_SANITY=1 pnpm dev
```

上記コマンドで起動した状態では `/quiz/sample-quiz-a` や `/quiz/sample-quiz-a/answer` が常に 200 を返し、UI を安全に確認できます。

### Vercel 設定メモ

- Vercel のダッシュボード > Project Settings > Functions > Node.js Version を **22.x** に設定してください。
- 本リポジトリは Node.js 22 を前提にビルドされるため、プレビュー/本番とも同一設定で運用してください。

## Google Analytics 4（GA4）

### 環境変数（Vercel）
- Project Settings → Environment Variables
  - Key: `VITE_GA_ID`
  - Value: `G-855Y7S6M95`
  - Target: Production / Preview を有効
- 保存後、再デプロイ（`main` / PR Preview いずれも可）

### 動作確認（GA4 コンソール）
1. 本番またはプレビュー URL を開く
2. GA4 管理画面 → 「リアルタイム」または「DebugView」を開く
3. 初回ページ表示で `page_view` を確認
4. サイト内リンクで数回遷移（トップ → 記事 → 正解ページ → 戻る など）
5. 遷移ごとに `page_view` が増えることを確認
6. Console にエラーや二重読み込みが出ていないことを確認

## Tests

### Unit / DOM (Vitest)
- `pnpm i`
- `pnpm test`  … 1回実行
- `pnpm test:watch` … 監視実行
- `pnpm check` … CI 用（verbose）

### E2E (Playwright) *任意*
Playwright ベースの E2E テストは未導入です。導入する場合の参考コマンドを以下に記載します。
- `pnpm dlx playwright install`
- `pnpm e2e`
