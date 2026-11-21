# Cloudflare Workers 移行メモ（試験 → 本番切替）

本番はまだ Vercel です。このブランチは **試験 Worker だけ** を足します。

- デプロイ先の Worker 名は `noutore-biyori-staging`。本番用 Worker `noutore-biyori` とは別のスクリプトです。
- `wrangler.jsonc` に routes / custom domain はありません。付くのは `*.workers.dev` だけです。
- 本番 DNS、お名前.com のネームサーバー、Vercel の設定、`main` へのマージは、この手順の「本番切替」までやりません。
- 値（トークン、パスワード、API キー）はチャット・Notion・Git に書きません。NOBU が画面へ直接入れます。

試験 URL の形（サブドメインはアカウントごとに違います）:

`https://noutore-biyori-staging.<アカウントのサブドメイン>.workers.dev`

---

## 試験デプロイ（スマホでやる手順）

2026-11-21 15:58 JST に、NOBU が GitHub Actions の Secrets へ `CLOUDFLARE_API_TOKEN`（Account › Workers Scripts › Edit のみ、アカウント 1 つ）と `CLOUDFLARE_ACCOUNT_ID` を登録済みです。本番の DNS 画面は開きません。

`workflow_dispatch`（Actions の Run workflow）は、そのワークフローファイルが default ブランチ（`main`）にあるときしか起動できません。試験中は `main` に入れないので、**`feat/cloudflare-workers-migration` への push が試験 Worker のデプロイ**です。他のブランチの push ではデプロイしません。

### 1. API トークンを作る（Cloudflare）

1. ブラウザで [Cloudflare ダッシュボード](https://dash.cloudflare.com/) を開く。右上のアカウントが脳トレ日和用か確認する。
2. 人アイコン → **My Profile** → **API Tokens** → **Create Token**。
3. テンプレート「Edit Cloudflare Workers」は使わない（KV・R2・ルート権限まで付く）。一番下の **Create Custom Token** を開く。
4. 名前の例: `noutore-biyori-staging deploy`。
5. **Permissions** は、登録済みのトークンと同じく次の 1 行から始める。

   | 範囲 | 項目 | 権限 |
   | --- | --- | --- |
   | Account | Workers Scripts | Edit |

   付けないもの: Workers KV Storage、Workers R2 Storage、Workers Routes、DNS、Zone の読み書き、Cache Purge、User Details。この Worker は KV も R2 も route も使いません。デプロイログが `workers.dev` のサブドメイン読み取りで権限不足と言ったときだけ、Account › Account Settings › Read を 1 行足す。先には付けない。
6. **Account Resources** は Include → 対象のアカウント 1 つだけ（All accounts にしない）。
7. **Zone Resources** は空のまま（ゾーン権限そのものが無い）。
8. 画面に Worker 名で絞る欄があれば `noutore-biyori-staging` だけにする。本番 Worker をこのトークンで上書きできないようにする。
9. **Continue to summary** → **Create Token**。表示された文字列を一度だけコピーする。この画面を閉じると二度と見られない。チャットには貼らない。

Account ID は、同じダッシュボードの Workers & Pages を開いたときの URL、またはアカウントの Overview に出る。`CLOUDFLARE_ACCOUNT_ID` として控える（秘密というより識別子。それでもリポジトリには書かない）。

### 2. GitHub に秘密を入れる

1. スマホのブラウザでリポジトリの Settings → **Secrets and variables** → **Actions** を開く。
   直リンク: `https://github.com/NBWMedia0807/noutore-biyori/settings/secrets/actions`
2. **New repository secret** を 2 回行う。

   | Name | 入れるもの |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | 手順 1 のトークン |
   | `CLOUDFLARE_ACCOUNT_ID` | アカウント ID |

3. **Variables** タブに、ビルドへ埋め込む値があれば追加する（秘密ではない）。

   | Name | 用途 |
   | --- | --- |
   | `VITE_GA_ID` | 本番と同じ GA4 測定 ID。未設定でもビルドは通る。`*.workers.dev` では計測コードが送信しない |

### 3. 試験ブランチを push する

1. `feat/cloudflare-workers-migration` への push で、Actions の **Cloudflare Workers deploy (staging)** が動く。`main` には push しない。
2. 中身は、設定が試験用かの確認、テスト、Cloudflare 向けビルド、dry-run、それから `wrangler deploy`。載るのは `noutore-biyori-staging` だけ。カスタムドメインは付かない。
3. ログにトークンは出ない。失敗したら権限の行だけを見て、足りない 1 つをトークンに足す。
4. 成功したら、ログの URL か、ダッシュボードの Workers & Pages → `noutore-biyori-staging` の `https://noutore-biyori-staging.<サブドメイン>.workers.dev` を開く。

`wrangler.jsonc` に routes や本番名が入っていると、デプロイの前に失敗します。Actions の Run workflow は、このファイルが `main` に入るまで使えません。

### 4. Worker の変数を入れる（Cloudflare）

デプロイで Worker ができてから、Workers & Pages → **noutore-biyori-staging** → **Settings** → **Variables and Secrets**。

- **Secret**（Encrypt）はパスワードやトークン。
- **Text** は秘密でない識別子。
- 本番 Worker には、切替の日まで何も入れない。

`PUBLIC_SITE_URL` と `CF_ARTICLE_CACHE_TTL` は `wrangler.jsonc` に書いてあり、デプロイのたびに入ります。ダッシュボードで同じ名前を重ねる必要はありません。

変数を追加・変更したあとは、その Worker の **Deployments** から最新版を再デプロイするか、Actions で deploy = true をもう一度実行する（Wrangler のバージョンによって、変数だけだと再デプロイが要ることがあります）。

### 5. 試験 URL で見ること

ホストが `*.workers.dev` のとき:

- どの応答にも `X-Robots-Tag: noindex` が付く。
- `/robots.txt` は `Disallow: /` だけで、Sitemap 行は無い。
- canonical、`/sitemap.xml`、RSS の中の URL は `https://noutorebiyori.com` のまま。
- AdSense のスクリプトは読み込まない（下記）。`/ads.txt` は本番と同じ本文で 200。
- GA4 は送信しない（本番ホスト名のときだけ計測する既存の動作）。

合格の目安: トップ、記事、カテゴリ、404、sitemap、各フィード、ads.txt、問い合わせ画面、`/api/revalidate` が意図したステータスを返す。検索結果に試験 URL が出ていない。

---

## AdSense を試験ホストでどうするか

**タグは残し、広告リクエストは出さない。**

`*.workers.dev` は AdSense の承認ドメインではありません。`adsbygoogle.js` を読み込むと、未承認ホストへのリクエストになり、ポリシー違反・無効トラフィック・収益の混線になり得ます。

そのため試験ホストでは次のようにします。

- `<ins class="adsbygoogle" data-ad-client="ca-pub-2298313897414846" data-ad-slot="...">` は HTML に残す（枠の存在確認用）。
- 実行される script の代わりに `type="text/plain"` と `data-adsense-staging="withheld"`、`data-src`（パブリッシャー ID 付き）を出す。ブラウザは取得も実行もしない。
- `app.html` の広告ドメイン向け preconnect / dns-prefetch / preload も、試験ホストの HTML から外す。
- `adsbygoogle.push` は呼ばない。
- `/ads.txt`（`google.com, pub-2298313897414846, DIRECT, ...`）は静的ファイルのまま返す。ファイルの配信確認であり、広告リクエストではない。

`noutorebiyori.com` / `www` / Vercel では、これまでどおりスクリプトを読みます。判定はリクエストのホスト名だけです。

---

## 実行時の変数（名前だけ）

値は書きません。場所は「誰がどこに入れるか」です。

### デプロイ時に `wrangler.jsonc` から入る（NOBU の入力は不要）

| 名前 | 内容 |
| --- | --- |
| `PUBLIC_SITE_URL` | `https://noutorebiyori.com`。canonical・IndexNow・パージの基点。試験ホストに変えない |
| `CF_ARTICLE_CACHE_TTL` | 記事のエッジキャッシュ秒。既定 `86400` |

### 試験 Worker に NOBU が入れる（ダッシュボードの Variables and Secrets）

公開データセットのまま読むだけなら、下の Sanity 識別子はコード内の既定値（project `quljge22` / dataset `production`）でも動きます。明示するなら Text で入れます。

| 名前 | 種別 | 試験で |
| --- | --- | --- |
| `SANITY_PROJECT_ID` | Text | 入れると既定値より優先。公開読み取りに必須ではない |
| `SANITY_DATASET` | Text | 同上。`production` |
| `SANITY_API_VERSION` | Text | 同上 |
| `SANITY_READ_TOKEN` | Secret | データセットが非公開のときだけ。公開なら空でよい |
| `SANITY_REVALIDATE_SECRET` | Secret | `/api/revalidate` を試すときだけ。**本番 Webhook とは別の値**にする。本番の Webhook の向き先は Vercel のまま |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_TO` | Secret（PORT は Text でも可） | 問い合わせ送信を試すときだけ。未設定だとフォームは 500 を返し、送れたようには見せない。ポートは 465 を推奨 |
| `LANDING_LOG` | Text | 任意。`off` で着地ログを止める。未設定は出る |

### 試験 Worker には入れない（本番切替のとき、本番 Worker だけ）

| 名前 | 理由 |
| --- | --- |
| `INDEXNOW_KEY` | 入っていると IndexNow が本番 URL を通知する。試験では空のまま（未設定なら通知しない） |
| `CF_ZONE_ID` | ゾーンのキャッシュ削除に使う。試験の workers.dev では不要。入れると本番ゾーンを消せる |
| `CF_PURGE_API_TOKEN` | 同上。権限は Zone › Cache Purge › Purge、対象ゾーンは `noutorebiyori.com` だけ。デプロイトークンとは別 |
| `SANITY_WRITE_TOKEN` `SANITY_AUTH_TOKEN` `SANITY_DEPLOY_TOKEN` `SANITY_API_TOKEN` | 書き込みに使える。試験には不要 |
| `SANITY_PREVIEW` `SANITY_PREVIEW_DRAFTS` | 下書きを公開側に出す。入れない |
| `SKIP_SANITY` | 入れると中身が空になる |
| `VERCEL_REVALIDATE_TOKEN` | Vercel の ISR 用。Worker では不要 |
| `PUBLIC_PUBLISHER_CENTER_VERIFICATION` | 所有権確認メタ。試験ホストに出さない |

ビルド時（Worker の実行時変数ではない）: GitHub Actions の Variables の `VITE_GA_ID`。`VITE_SANITY_PROJECT_ID` / `VITE_SANITY_DATASET` は未設定でもフィードはコード内の既定値を使います。

GitHub Actions の Secrets（Worker の中では使わない）: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。場所はリポジトリの Settings → Secrets and variables → Actions。

---

## 本番 Worker（ドメインはまだ付けない）

2026-11-21 16:15 に NOBU が本番 Worker の作成を承認した。この段階でやるのは Worker `noutore-biyori` を `*.workers.dev` に出すことだけ。`noutorebiyori.com` のカスタムドメインと routes は、変数を入れたあとの別作業。

試験 Worker `noutore-biyori-staging` はそのまま残す。ブランチ `deploy/cloudflare-production` への push だけが本番スクリプトをデプロイする（`.github/workflows/cloudflare-workers-production.yml`）。`main` にはマージしない。

避ける時刻（日本時間）: 08:00、09:00、12:30、22:00 の前後 15 分。ワークフローもこの時刻なら止まる。

### 2026-11-21 16:20 時点の DNS（公開情報）

お名前.com のネームサーバー変更は不要。すでに Cloudflare になっている。

- ネームサーバー: `cullen.ns.cloudflare.com` / `dahlia.ns.cloudflare.com`
- レジストラ: Cloudflare, Inc.（RDAP の最終変更 2026-11-20T21:57Z）
- サイトの応答はまだ Vercel（`server: Vercel`）
- apex: A `216.198.79.1`
- www: CNAME `cname.vercel-dns.com`
- TXT 3 件（Google の確認 2、TikTok 1）
- MX / AAAA / CAA は無し

Vercel は 11/21 に Hobby へ下げ済み。プロジェクトは消さない。切り戻し先として残す。急がない。

### 本番 Worker に入れる変数

値は書かない。Vercel の同じ名前から NOBU が写す。Vercel で Sensitive になって見えないものは、発行元で作り直す。

Vercel の画面（PR #587 の Vercel チェックが指していたプロジェクト。ログイン後の画面の中身は未確認）:

`https://vercel.com/nbwmedias-projects-f609a963/noutore-biyori/settings/environment-variables`

チームが違って開けないときは、ダッシュボードでプロジェクト名 **noutore-biyori** → Settings → Environment Variables。

Cloudflare の画面（アカウント ID は GitHub がマスクするため、ここには書かない。未確認）:

`https://dash.cloudflare.com/<account_id>/workers/services/view/noutore-biyori/production/settings`

スマホでは Workers & Pages → **noutore-biyori**（staging ではない）→ Settings → Variables and Secrets。アドレス欄の `dash.cloudflare.com/` の次がアカウント ID。

`PUBLIC_SITE_URL`（`https://noutorebiyori.com`）と `CF_ARTICLE_CACHE_TTL`（`86400`）は `wrangler.jsonc` からデプロイ時に入る。ダッシュボードで重ねなくてよい。

| Worker の名前 | 種別 | Vercel の名前 | いつ |
| --- | --- | --- | --- |
| `SANITY_PROJECT_ID` | Text | `SANITY_PROJECT_ID` | 初日推奨。空でもコードの既定 `quljge22` で公開データは読める |
| `SANITY_DATASET` | Text | `SANITY_DATASET` | 同上。既定は `production` |
| `SANITY_API_VERSION` | Text | `SANITY_API_VERSION` | 同上。既定は `2024-01-01` |
| `SANITY_READ_TOKEN` | Secret | `SANITY_READ_TOKEN` | データセットが公開のあいだは任意。非公開にしたら必須 |
| `SANITY_REVALIDATE_SECRET` | Secret | `SANITY_REVALIDATE_SECRET` | ドメインを付けて Webhook を向ける日に必須。この workers.dev 段階では任意 |
| `SMTP_HOST` | Text | `SMTP_HOST` | 問い合わせを動かす日に必須。下記 |
| `SMTP_PORT` | Text | `SMTP_PORT` | 同上。Workers では **465** |
| `SMTP_USER` | Secret | `SMTP_USER` | 同上 |
| `SMTP_PASS` | Secret | `SMTP_PASS` | 同上 |
| `MAIL_TO` | Text | `MAIL_TO` | 同上。届く先はこのアドレス |
| `INDEXNOW_KEY` | Secret | `INDEXNOW_KEY` | 任意。入れると公開 URL を IndexNow に通知する。ドメインを付ける前は空のまま |
| `CF_ZONE_ID` | Text | Vercel には無い | 任意。ゾーンのキャッシュ削除を使うとき。Cloudflare のゾーン画面の Zone ID |
| `CF_PURGE_API_TOKEN` | Secret | Vercel には無い。新規 | 任意。権限は Zone › Cache Purge › Purge、ゾーンは `noutorebiyori.com` だけ。デプロイ用トークンとは別 |
| `PUBLIC_PUBLISHER_CENTER_VERIFICATION` | Text | `PUBLIC_PUBLISHER_CENTER_VERIFICATION` | 任意。Publisher Center の確認メタ |
| `LANDING_LOG` | Text | `LANDING_LOG` | 任意。`off` で着地ログを止める。空なら出る |
| `VITE_GA_ID` | ビルド時（Worker の実行時変数ではない） | `VITE_GA_ID` | ドメインを付けるビルドの前に GitHub の Actions Variables へ。workers.dev では計測しない |

入れない: `SANITY_WRITE_TOKEN` / `SANITY_AUTH_TOKEN` / `SANITY_DEPLOY_TOKEN` / `SANITY_API_TOKEN`（書き込み）、`SANITY_PREVIEW` / `SANITY_PREVIEW_DRAFTS`、`SKIP_SANITY`、`ENABLE_QUIZ_STUB`、`VERCEL_REVALIDATE_TOKEN`（`SANITY_REVALIDATE_SECRET` があれば Worker では不要）。

`VITE_SANITY_PROJECT_ID` / `VITE_SANITY_DATASET` / `VITE_SANITY_API_VERSION` はビルド時。空でもコードの既定値を使う。

### ドメインを付ける（変数のあと。今はしない）

1. 上の必須項目を本番 Worker に入れ、Workers の画面で再デプロイするか、`deploy/cloudflare-production` へ空でない push をする。試験 Worker にはドメインを付けない。
2. 時刻が 08:00 / 09:00 / 12:30 / 22:00 の前後でないことを確認する。
3. DNS 画面で、apex の A が `216.198.79.1`、www の CNAME が `cname.vercel-dns.com`、TXT が 3 件残っていることを見る。ネームサーバーは変えない。
4. Workers & Pages → **noutore-biyori** → Settings → Domains & Routes。`noutorebiyori.com` と `www.noutorebiyori.com` をカスタムドメインとして追加する。`wrangler.jsonc` には書かない。
5. 数分後に確認する。
   - `https://www.noutorebiyori.com/` が **308** で `https://noutorebiyori.com/` へ
   - HSTS `max-age=63072000`
   - トップ、記事、`/robots.txt` は Allow と `Sitemap: https://noutorebiyori.com/sitemap.xml`（Disallow ではない）
   - `/ads.txt` が 200 で同じ本文。広告スクリプトが **読み込まれる**
   - sitemap とフィード
   - 下の問い合わせテスト
   - Sanity Webhook を `https://noutorebiyori.com/api/revalidate` へ。更新が 200
   - GA4 のリアルタイム。TXT の確認が残っていること
6. Rocket Loader、Email Obfuscation、Bot Fight Mode は OFF。
7. 48〜72 時間見る。Vercel のプロジェクトは消さない。

### 問い合わせの確認（ドメインを付けたあと）

送る人: NOBU。スマホのブラウザで `https://noutorebiyori.com/contact` を開き、名前、自分のメール、件名、本文を入れて送信する。

届く先: Worker の `MAIL_TO` のアドレス。届いた件名は `【お問い合わせ】` で始まる。

成功すると画面は「お問い合わせいただきありがとうございます。」失敗すると「サーバーエラーにより、お問い合わせを送信できませんでした。」または設定不足の文言。500 のときは送れたことにしない。

ログ: Cloudflare → Workers & Pages → **noutore-biyori** → Logs（または Observability）。失敗は `Error sending email:`。変数が空なら `One or more SMTP environment variables are not set.` パスワードはログに出ない。

### 戻す

カスタムドメインを付けたあと:

1. 本番 Worker の Domains & Routes から apex と www を外す。
2. DNS を Vercel のままにする。プロキシ OFF で、apex の A は `216.198.79.1`、www の CNAME は `cname.vercel-dns.com`。TXT 3 件は残す。
3. 反映の目安は 5〜10 分。応答の `server` が Vercel に戻ることを見る。
4. ネームサーバーは Cloudflare のまま戻さない（レコードが Vercel を向いていればサイトは Vercel）。
5. Vercel はすでに Hobby。商用（AdSense）の受け皿としては規約上使えないことがあり、戻したあとに 402 や 503 になり得る。プロジェクトは残している。Hobby で表示できないときは、Worker のドメインを外す前の版を優先し、別の受け皿を NOBU が決める。急いで消さない。

---

## ビルドの切り替え

| 目的 | コマンド | アダプター |
| --- | --- | --- |
| Vercel（既定・現行本番） | `pnpm build` | `@sveltejs/adapter-vercel` 5.10.2 |
| Cloudflare Workers | `pnpm build:cloudflare`（= `DEPLOY_TARGET=cloudflare vite build`） | `@sveltejs/adapter-cloudflare` 7.2.10 |

- `DEPLOY_TARGET` が未設定なら Vercel です。Vercel のプロジェクト設定は変えません。
- adapter-cloudflare は 7.x です。8.x は `@sveltejs/kit` 3 が必要で、kit 2.36.2 とは使えません。
- 出力は `.svelte-kit/cloudflare/`（`wrangler.jsonc` の `main` と `assets.directory`）。
- 設定が試験用かは `node scripts/check-cloudflare-staging-config.mjs` で確認します。

ローカルで Workers 実行環境を試す:

```bash
pnpm build:cloudflare
pnpm exec wrangler dev --var SANITY_PROJECT_ID:quljge22 --var SANITY_DATASET:production --var SANITY_API_VERSION:2024-01-01
```

Sanity に繋がらないときは `SKIP_SANITY=1` と `ENABLE_QUIZ_STUB=1` を `--var` で足す。`.dev.vars` は `.gitignore` 済み。コミットしない。

`http://127.0.0.1:8787` は `*.workers.dev` ではないので、noindex と広告の停止は付きません。試験ホストの動作は、リクエストの Host を `noutore-biyori-staging.workers.dev` にしたときに確認します。

## Vercel 固有機能の置き換え

| Vercel | Cloudflare（このブランチ） | 場所 |
| --- | --- | --- |
| ISR（記事 `expiration: false`） | 記事に `Cache-Control: public, max-age=60, s-maxage=<CF_ARTICLE_CACHE_TTL>` と `Cache-Tag`。UTM 付き URL はクエリなし URL のキャッシュを優先 | `src/lib/server/edge-cache.js`、`src/hooks.server.js` |
| 一覧・フィード・sitemap の `s-maxage` | adapter 内蔵の Cache API が使う。`Cache-Tag: noutore-page` | 同上 |
| `/api/revalidate` の `x-prerender-revalidate` | Cloudflare ではその拠点の `cache.delete`。`CF_ZONE_ID` と `CF_PURGE_API_TOKEN` があればゾーンの purge（URL とタグ）。Vercel の経路は従来どおり | `src/routes/api/revalidate/+server.js` |
| `vercel.json` の www → apex 308 | Worker 内で 308（パスとクエリを保持） | `edge-cache.js` |
| Vercel の HSTS | `Strict-Transport-Security: max-age=63072000`（https のとき） | `edge-cache.js` |
| 試験ホストのインデックス | HTML と robots.txt は Worker が `X-Robots-Tag: noindex`。静的ファイル（ads.txt、画像）はアセット配信で Worker を通らないため、試験ビルドの `_headers` で同じヘッダーと HSTS を付ける | `src/lib/staging-host.js`、`src/cloudflare-entry.js`、`scripts/append-staging-asset-headers.mjs` |

キャッシュする記事は `/category/<カテゴリ>/<記事>` と `/quiz/<記事>/answer`。`/quiz/<記事>` は canonical への 308 なので対象外です。

### キャッシュの注意

- Cache API はデータセンターごとです。全拠点から消すにはゾーンの purge が要ります。未設定のあいだ、他の拠点は TTL（既定 1 日）まで古いままです。
- workers.dev では Cache API が効かないことがあります。キャッシュとパージの確認は、本番ドメインを付ける段階で行います。試験中に本番ゾーンの purge トークンは入れません。
- `CF_PURGE_API_TOKEN` の権限は Zone › Cache Purge › Purge、ゾーンは `noutorebiyori.com` だけです。作り方: [API トークン](https://dash.cloudflare.com/profile/api-tokens) の Create Custom Token。

## IndexNow

通知の基点は `PUBLIC_SITE_URL`（未設定なら `https://noutorebiyori.com`）です。`*.vercel.app` や `*.workers.dev` は使いません。試験 Worker に `INDEXNOW_KEY` を入れなければ通知しません。

## お問い合わせメール

コードが読む名前は `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_TO` だけ。ほかのメール用の名前は無い。

`src/routes/contact/+page.server.js` は `secure` を `SMTP_PORT` が 465 のときだけ true にする。465 は接続の最初から TLS。それ以外（587 を含む）は `secure: false` で、nodemailer 7.0.11 がサーバの STARTTLS 案内を見ると `STARTTLS` コマンドのあと `tls.connect({ socket, host })` で平文ソケットを TLS に上げる。

Workers の外向きではポート 25 は使えない。465 と 587 は、その禁止リストには入っていない。

このリポジトリの nodemailer は **7.0.11**。上流が Cloudflare Workers（`nodejs_compat`）で STARTTLS の送信を確認したのは 2026-09-02 の commit `8b03240` 以降で、7.0.11 には入っていない。その修正は `os.networkInterfaces()` が空オブジェクトのとき DNS のアドレス族判定が失敗する問題向けで、465 も 587 もホスト名の解決で先に失敗し得る。Workers の `node:tls` は公式に一部対応。STARTTLS は既存ソケットのアップグレードなので、465 の最初からの TLS より失敗しやすい。`tls.rejectUnauthorized: false` は Workers が拒否する。この環境では実際の SMTP 送信はまだしていない（未確認）。

方針: `SMTP_PORT` は **465**。プロバイダが 587 しか無いときは `SMTP_PORT=587` のまま入れる（コードは STARTTLS を試す）。届かずログが `Error sending email:` / `ETLS` / `ECONNECTION` / 名前解決失敗なら、nodemailer を `8b03240` 以降へ上げて再試験するか、HTTP のメール API に切り替える。秘密はリポジトリに書かない。

## デプロイ用トークン（再掲）

2026-11-21 15:58 に登録されたトークンの権限は、アカウント 1 つに閉じた次の 1 つです。

- Account › **Workers Scripts** › **Edit**

2026-11-21 の初回デプロイ（Actions run 44878319469）は、この 1 権限だけで `noutore-biyori-staging.nbwmedia-jp.workers.dev` まで成功しました。Account Settings Read は不要でした。KV・R2・Durable Objects・D1・Queues・カスタムドメイン・DNS・ゾーンの Cache Purge・Workers Tail も使っていません。

テンプレート「Edit Cloudflare Workers」は使いません。トークンの値はリポジトリにもログにも出しません。
