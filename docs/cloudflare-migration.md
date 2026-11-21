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

## 本番切替（試験が合格し、NOBU が承認してから）

ここから先は **今はやらない**。試験 URL の確認と、切り戻せる状態の確認が先です。作業当日まで Vercel の本番はそのまま残します。

避ける時間帯: 08:00、09:00、12:30、22:00（自動投稿・公開）。平日の 14〜16 時が無難です。

### A. 本番 Worker を別につくる

1. 試験 Worker の名前は変えない。本番は新しい Worker **`noutore-biyori`**。
2. 切替用の変更で、本番用の設定を足す（このブランチには置いていない）。routes は、カスタムドメインをダッシュボードで付けるなら設定ファイルに書かなくてよい。試験ビルドが `_headers` に足す `/*` の noindex は本番 Worker では実行しない（`scripts/append-staging-asset-headers.mjs` は試験ワークフローだけ）。
3. 本番 Worker 用のトークンは試験用と分ける。権限は同じ 2 つでよく、スクリプト名を絞るなら `noutore-biyori`。
4. 変数は試験で足りたものに加え、上の「入れない」リストのうち必要なもの（`INDEXNOW_KEY`、メール、`CF_ZONE_ID`、`CF_PURGE_API_TOKEN`）を **本番 Worker だけ** に入れる。値は Vercel の環境変数から NOBU が写す。Vercel で Sensitive になって読めないものは、発行元で再発行する。

### B. DNS を写してからネームサーバーを変える

1. お名前.com で、いまのレコードを画面のまま控える（スクリーンショットでよい）。公開情報では次のとおり（切替前にもう一度見ること）。
   - apex: A `216.198.79.1`（Vercel）
   - www: CNAME `cname.vercel-dns.com`
   - TXT: Google の確認が 2 件、TikTok が 1 件
   - MX は無し。他にサブドメインや確認用レコードがあればそれも写す
2. Cloudflare でゾーン `noutorebiyori.com` を追加する（Full setup）。
3. 控えたレコードを **プロキシ OFF（DNS only、グレー雲）** で同じ向き先のまま入れる。TXT は 3 件とも必須。まだサイトは Vercel のままになる。
4. お名前.com Navi → ネームサーバー設定 → 対象ドメイン → その他のサービス → その他のネームサーバー → Cloudflare が表示した NS を入れて確認。
5. Cloudflare のゾーンが **Active** になるまで待つ（最大 48 時間）。外部から `noutorebiyori.com` が今までどおり開き、証明書エラーが無いことを確認してから次へ進む。NS を変えても、中のレコードが Vercel を向いていればこの間は落ちない。

### C. ドメインを本番 Worker に付ける

1. NOBU が「切り替えてよい」と明示してから。
2. Workers & Pages → **noutore-biyori**（staging ではない）→ Settings → **Domains & Routes**。
3. `noutorebiyori.com` と `www.noutorebiyori.com` をカスタムドメインとして追加する。既存の A / CNAME とぶつかる案内が出たら、その画面の手順で Worker 側に寄せる。試験 Worker にはドメインを付けない。
4. 反映は Cloudflare 内なので数分。次を確認する。
   - `https://www.noutorebiyori.com/` が **308** で `https://noutorebiyori.com/` へ（パスとクエリは残る）
   - `Strict-Transport-Security: max-age=63072000`
   - トップ、記事、一覧、404、末尾スラッシュ
   - `/sitemap.xml` の件数、`/robots.txt` は Allow と本番 sitemap（試験用の Disallow ではない）
   - `/ads.txt` が 200 で同じ本文。広告スクリプトが **読み込まれる**（試験ホストとは逆）
   - フィード（SmartNews、Gunosy、Pinterest、Trill、merkystyle）が取得できる
   - 問い合わせメールが届く
   - Sanity の Webhook の向き先を `https://noutorebiyori.com/api/revalidate` にし、更新が 200 で記事に反映される
   - GA4 のリアルタイム、Search Console の TXT が残っていること
5. Cloudflare の Rocket Loader、Email Obfuscation、Bot Fight Mode は OFF（広告とフィードのクローラーを止めない）。

### D. 監視してから Vercel を下げる

1. 48〜72 時間見る。見るもの: 5xx、Workers の CPU とエラー、Sanity の呼び出し数、AdSense の ads.txt 状態と翌日の収益、Search Console のクロール、各フィードの取得失敗。
2. このあいだ Vercel のプロジェクトと最後のデプロイは消さない。切り戻し先である。
3. 問題が無ければ NOBU が Vercel の Settings → Billing → Plan → Downgrade を行う。AdSense を出しているこのサイトは Hobby の利用条件を満たさない。ダウングレード後は Vercel へすぐ戻せないことがある。だから解約・ダウングレードは監視のあと。
4. レジストラ（お名前.com）の移管は、安定してから別作業にする。

### E. Vercel へ戻す

カスタムドメインを付けたあとなら:

1. Cloudflare で本番 Worker のカスタムドメイン（apex と www）を外す。
2. DNS を元に戻す。プロキシ OFF のまま、apex の A を `216.198.79.1`、www の CNAME を `cname.vercel-dns.com`。
3. 反映の目安は 5〜10 分。Vercel 側に動いているデプロイがあることが前提。
4. ネームサーバーを戻す必要は、レコードが Vercel を向いていれば無い。
5. Vercel をすでに Hobby へ下げたあと、またはプロジェクトを消したあとは、この戻し方は使えない。その場合は Worker の直前の版を残し、別の受け皿を NOBU と決めてから下げる。

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

- nodemailer を Workers（`nodejs_compat`）で使います。ポート 25 は使えません。`SMTP_PORT` は **465**。
- 失敗すると 500 を返し、ログに `Error sending email:` が出ます。
- 動かなかったときの次の案（実装は結果を見てから。秘密はリポジトリに書かない）:
  1. HTTP のメール API（Resend など）。キーは Worker の Secret。
  2. ゾーン移管後の Cloudflare Email Routing（`send_email`）。
  3. それまでのあいだ、問い合わせページに連絡先を出す。
- どの案にするか、費用が要るかは NOBU が決めます。

## デプロイ用トークン（再掲）

2026-11-21 15:58 に登録されたトークンの権限は、アカウント 1 つに閉じた次の 1 つです。

- Account › **Workers Scripts** › **Edit**

2026-11-21 の初回デプロイ（Actions run 44878319469）は、この 1 権限だけで `noutore-biyori-staging.nbwmedia-jp.workers.dev` まで成功しました。Account Settings Read は不要でした。KV・R2・Durable Objects・D1・Queues・カスタムドメイン・DNS・ゾーンの Cache Purge・Workers Tail も使っていません。

テンプレート「Edit Cloudflare Workers」は使いません。トークンの値はリポジトリにもログにも出しません。
