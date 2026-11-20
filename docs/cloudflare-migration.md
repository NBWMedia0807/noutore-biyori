# Cloudflare Workers 移行メモ（Vercel → Cloudflare）

本番はまだ Vercel です。このメモは移行用コードの使い方と、切替前に確認することをまとめたものです。
**このブランチの時点では未デプロイ・DNS 未変更です。**

## 1. ビルドの切り替え

| 目的 | コマンド | アダプター |
| --- | --- | --- |
| Vercel（既定・現行本番） | `pnpm build` | `@sveltejs/adapter-vercel` 5.10.2 |
| Cloudflare Workers | `pnpm build:cloudflare`（= `DEPLOY_TARGET=cloudflare vite build`） | `@sveltejs/adapter-cloudflare` 7.2.10 |

- `DEPLOY_TARGET` が未設定なら Vercel です。Vercel 側の設定は何も変えなくてよいです。
- 同じ main を両方でビルドできるので、切り戻しは「Vercel へ DNS / カスタムドメインを戻す」だけです。
- adapter-cloudflare は 7.x を使います。8.x は `@sveltejs/kit ^3` が必要で、kit 2.36.2 とは組み合わせられません。
- Cloudflare のビルド出力は `.svelte-kit/cloudflare/`（`wrangler.jsonc` の `main` / `assets.directory`）。

ローカルで Workers 実行環境（workerd）を試す:

```bash
SKIP_SANITY=1 pnpm build:cloudflare
pnpm exec wrangler dev --var SKIP_SANITY:1 --var ENABLE_QUIZ_STUB:1
# → http://localhost:8787/quiz/sample-quiz-a/answer など
```

`.dev.vars` に値を書いて試すこともできます（`.gitignore` 済み。コミットしない）。

## 2. Vercel 固有機能の置き換え

| Vercel | Cloudflare（このブランチ） | 場所 |
| --- | --- | --- |
| ISR（記事ページ `expiration: false`） | 記事ページに `Cache-Control: public, max-age=60, s-maxage=<CF_ARTICLE_CACHE_TTL>` と `Cache-Tag` を付け、adapter-cloudflare 内蔵の Cache API 保存に任せる。UTM 付き URL はクエリなし URL のキャッシュを優先して返す | `src/lib/server/edge-cache.js`、`src/hooks.server.js` |
| CDN の `s-maxage`（一覧・フィード・sitemap） | adapter-cloudflare 内蔵のキャッシュがそのまま `s-maxage` を使う。パージ用に `Cache-Tag: noutore-page` を付与 | 同上 |
| `/api/revalidate` の `x-prerender-revalidate` | Cloudflare 実行時は ① その拠点の `cache.delete` ② `CF_ZONE_ID` と `CF_PURGE_API_TOKEN` があればゾーンの purge API（URL 指定 ＋ タグ指定）。Vercel 経路は従来のまま | `src/routes/api/revalidate/+server.js` |
| `vercel.json` の www → apex 308 | Worker 内で 308（パス・クエリ保持） | `edge-cache.js` |
| Vercel が付ける HSTS | Worker で `Strict-Transport-Security: max-age=63072000`（https のときのみ） | `edge-cache.js` |

キャッシュ対象の「記事ページ」は `/category/<カテゴリ>/<記事>`（canonical）と `/quiz/<記事>/answer`。
`/quiz/<記事>` は canonical への 308 なので対象外です。

### キャッシュの注意点

- Workers の Cache API は**データセンターごと**です。`cache.delete` は Webhook を受けた拠点しか消えません。
  全拠点から消すには、ゾーンの purge API（`CF_ZONE_ID` ＋ `CF_PURGE_API_TOKEN`）が必要です。
  未設定のときは他拠点が `CF_ARTICLE_CACHE_TTL`（既定 86400 秒＝1日）まで古いままです。
- パージが確実に効くことを確かめるまでは TTL を 1 日にしておき、確認後に 604800（7日）などへ延ばす想定です。
- Cache API は **カスタムドメインの Worker でのみ**確実に動きます（workers.dev では効かない場合があります）。
  キャッシュとパージの確認は、計画のステージング（例: `cf.noutorebiyori.com`）で行ってください。
- Cache API は `stale-while-revalidate` に対応していません（期限切れ後の最初の1回は描画を待ちます）。
- `CF_PURGE_API_TOKEN` は「Zone → Cache Purge」権限だけを持つ API トークンにしてください。
  作成画面: https://dash.cloudflare.com/profile/api-tokens （「Create Custom Token」→ 権限 Zone / Cache Purge / Purge、対象ゾーンは noutorebiyori.com のみ）。

## 3. IndexNow

通知する URL の基点を `PUBLIC_SITE_URL`（未設定なら `https://noutorebiyori.com`）に変更しました。
これまでは `VERCEL_URL`（`*.vercel.app`）が基点で、IndexNow に送る `host`（noutorebiyori.com）と一致せず、
拒否されていた可能性があります。`PUBLIC_SITE_URL` が本番と別ホストのときも本番ドメインに戻します。

## 4. お問い合わせメール（nodemailer / SMTP）

- まずは現行の nodemailer をそのまま Workers（`nodejs_compat`）で試します。
  Workers は送信ポート 25 を使えません。`SMTP_PORT` は **465（SMTPS）** を推奨します（587 + STARTTLS は動かない場合あり）。
- 送信に失敗するとフォームは 500 を返し、ログに `Error sending email:` が出ます（成功したように見せません）。
- 動かない場合のフォールバック方針（実装は検証結果を見てから。秘密はコード・リポジトリに書かない）:
  1. **HTTP API のメール送信サービス**（例: Resend / SendGrid 等）に切り替える。
     `fetch` だけで送れるので Workers で確実に動く。API キーは Worker のシークレットに登録。
  2. **Cloudflare Email Routing の `send_email` バインディング**。宛先（MAIL_TO）を Email Routing で認証済みにする必要があり、
     ゾーンを Cloudflare に移した後でないと使えない。
  3. 上記が間に合わない場合の一時策として、問い合わせページに連絡用メールアドレスを表示する。
- どの方式にするか・費用が発生するかは NOBU の判断事項です。

## 5. 環境変数（名前のみ。値はここに書かない）

`wrangler.jsonc` の `vars` に置いてよいのは秘密でない値だけです（`PUBLIC_SITE_URL`、`CF_ARTICLE_CACHE_TTL`）。
それ以外は `wrangler secret put <NAME>` か Cloudflare ダッシュボードで登録します。

- Sanity: `SANITY_PROJECT_ID` / `SANITY_DATASET` / `SANITY_API_VERSION` / `SANITY_READ_TOKEN` ほか、`SANITY_REVALIDATE_SECRET`
- メール: `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_TO`
- 通知: `INDEXNOW_KEY`
- キャッシュ: `CF_ARTICLE_CACHE_TTL`（任意）、`CF_ZONE_ID`、`CF_PURGE_API_TOKEN`
- ビルド時: `VITE_GA_ID` ほか `VITE_*`（GitHub Actions では repository variables から渡す）

## 6. デプロイ

`.github/workflows/cloudflare-workers-deploy.yml` は**手動実行のみ**です。既定はビルドと dry-run だけで、
`deploy=true` を選んだときだけ `wrangler deploy` します。`wrangler.jsonc` に routes / custom_domain が無いため、
デプロイ先は `*.workers.dev` だけです。本番ドメインの割り当て・DNS 変更はこのワークフローでは行いません。

必要な GitHub Secrets（NOBU が登録）: `CLOUDFLARE_API_TOKEN`（Workers Scripts:Edit のみ）、`CLOUDFLARE_ACCOUNT_ID`。
作成画面: https://dash.cloudflare.com/profile/api-tokens （テンプレート「Edit Cloudflare Workers」）、
登録画面: https://github.com/NBWMedia0807/noutore-biyori/settings/secrets/actions

## 7. 切替後に確認すること（抜粋）

- 記事ページ: 2回目以降のアクセスで描画されない（Sanity API の利用量が増えていない）
- Sanity で記事を更新 → `/api/revalidate` が 200、`revalidated[].method` が `cloudflare-zone-purge`、すぐ反映される
- `curl -I https://www.noutorebiyori.com/x` が 308 → `https://noutorebiyori.com/x`
- `Strict-Transport-Security: max-age=63072000` が付いている
- お問い合わせメールが届く
