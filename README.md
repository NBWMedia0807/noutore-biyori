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

## 公開日時（publishedAt）

- `quiz` ドキュメントに `publishedAt: datetime` を追加しました（必須、初期値=作成時刻）。
- Studio の記事編集画面では任意の日時（日本時間）に変更でき、並び順や公開可否の判定に利用します。
- 既存データで `publishedAt` が未設定のものは `_createdAt` で補完できます。必要に応じて以下のスクリプトを実行してください。

```bash
SANITY_PROJECT_ID=<id> SANITY_DATASET=production SANITY_WRITE_TOKEN=<token> \
node scripts/backfill-publishedAt.mjs
```

### 反映
Sanity Studio のスキーマを更新した際は、以下の手順で反映・キャッシュクリアを行ってください。

1. **ローカル開発環境**
   - Studio を再起動します。`pnpm --dir studio dev` を一度停止し、再度起動してください。
   - 既存のビルド結果が必要な場合は `pnpm --dir studio build` で再ビルドします。
2. **ホスティング環境**
   - **Vercel**: 対象の Studio デプロイを再実行し、新しいスキーマを含んだビルドを作成します。
   - **Sanity Hosted Studio**: `pnpm --dir studio dlx sanity@latest deploy` もしくは `npx sanity@latest deploy` で再デプロイします。
3. **ブラウザキャッシュのクリア**
   - Studio にアクセスする際は `https://<studio-host>/?force=1` のように `?force=1` クエリを付与してキャッシュを強制リロードするか、シークレットモードで開き直してください。もしくは **Cmd+Shift+R** / **Ctrl+Shift+R** でスーパーリロードします。
   - それでも更新が反映されない場合は、ブラウザのストレージ（localStorage / IndexedDB）をクリアしてから再読込します。

Vercel 版と Hosted 版の Studio はどちらも `src/lib/sanityDefaults.js` に定義した `projectId` / `dataset` を参照します。環境変数で上書きしない限り、双方が同一の Sanity プロジェクト（`quljge22` / `production`）を指すため、データの参照先がズレない構成になっています。

codex/add-publishedat-field-to-quiz-document-6zd8p9
### Vision での確認用クエリ

Sanity Studio の Vision で公開日時が正しく保存されているか確認する際は、以下のクエリを実行してください。

```
*[_type == "quiz"]{_id, title, publishedAt} | order(_updatedAt desc)[0...5]
```


main
### バックデート公開の運用手順

- Sanity Studio の記事編集画面には `公開日時 (publishedAt)` フィールドがあります。新規作成時は自動で現在時刻がセットされます。
- 過去日に公開したい場合は、`公開日時` に任意の過去日時（日本時間）を入力してから **Publish** してください。サイト上の表示日と並び順はこの値で統一されます。
- 未来日時を設定したまま Publish すると、プレビュー以外の公開サイトでは該当記事が非表示になります（日時が到来すると自動で表示されません。必要に応じて日時を手動で更新してください）。
- 上記のバックフィルスクリプトはドラフトを除外し、公開済みクイズのみを `_createdAt` で補完します。

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

