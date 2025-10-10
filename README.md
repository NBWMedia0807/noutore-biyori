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

### Sanity 予約公開と ISR 再検証の設定

1. Vercel の Environment Variables に以下を追加します（Production / Preview 両方）。値は十分な長さのランダム文字列を推奨します。

   | Key                         | 用途                                                                 |
   | --------------------------- | -------------------------------------------------------------------- |
   | `SANITY_REVALIDATE_SECRET`  | Sanity Webhook からの認証、および ISR の再検証トークンとして利用します。 |
   | `VERCEL_REVALIDATE_TOKEN`※ | 任意。`SANITY_REVALIDATE_SECRET` と別値にしたい場合のみ設定します。     |

   ※未設定の場合は `SANITY_REVALIDATE_SECRET` の値が再検証トークンとして使われます。

2. Sanity Studio > Project settings > API > Webhooks で新しい Webhook を作成します。

   - **URL**: `https://<your-domain>/api/revalidate?secret=<SANITY_REVALIDATE_SECRET>`
   - **Trigger on**: `Create`, `Update`, `Delete`, `Publish`, `Unpublish`, `Schedule execute`
   - **Filter**: `_type == "quiz"`
   - **HTTP method**: `POST`

3. 予約公開が実行された際に Vercel のログに `revalidate` の出力が記録されます。必要に応じて Vercel の Functions ログで確認してください。

### Google アナリティクス (GA4) 設定

1. Vercel のダッシュボードで対象プロジェクトを開き、**Settings > Environment Variables** を選択します。
2. 「Add new」から以下の値を Production と Preview の両方に追加し、デプロイを再実行してください。

   | Key          | Value          | Target                 |
   | ------------ | -------------- | ---------------------- |
   | `VITE_GA_ID` | `G-855Y7S6M95` | Production / Preview |

3. 必要に応じてローカル環境でも `.env.local` に同じキーを追加すると、開発中に GA 連携を確認できます。

#### デプロイ後のトラッキング確認手順（GA4 リアルタイム / DebugView）

1. 上記設定を適用したうえで、Vercel にデプロイされたプレビューもしくは本番環境の URL を開きます。
2. 別タブで `https://analytics.google.com/` にログインし、対象プロパティの **リアルタイム** ビューを開いて、アクセス中のデバイスが一覧に表示されることを確認します。
3. 同じプロパティの **DebugView** も開き、初回ページロード後に `page_view` イベントが自動送信されているかをリアルタイムで確認します。
4. サイト内で複数ページを遷移し、イベントが連続して計測されていることを DebugView で再度確認します。
5. イベントが表示されない場合はブラウザのトラッキング防止機能や広告ブロッカーを一時的に無効化し、再読み込みしてください。

