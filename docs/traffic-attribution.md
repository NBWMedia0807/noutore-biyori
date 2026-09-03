# 流入元の内訳を測る（フェーズA）

GunosyRSS 連携の開始後、GA4 の「セッションの参照元 / メディア」で
`(direct) / (none)` と `(not set)` が流入の大半を占め、内訳が分からない状態だった。

## 方針：既存レポートを壊さずに内訳だけ足す

**セッションの参照元 / メディアは書き換えない。** `gtag('set','campaign',...)` は使わず、
`content_group` と `traffic_partner` を足すだけにしている。

そのため `(direct)/(none)` や `(not set)` は**これまでどおり残る**が、
GA4 の探索でこれらのディメンションを使えば内訳が分解できる。
既存レポートの数値も時系列も変わらないので、切替日を境にした段差が出ない。

将来 `(direct)/(none)` から実際に切り出したくなったら、`campaign` の指定を足す（フェーズB）。

## 送っているパラメータ

| パラメータ           | 値                                                                                          | どこから                                           |
| -------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `content_group`      | `site`                                                                                      | サイト本体のPV（`src/lib/ga.ts`）                  |
| `content_group`      | `gunosy_inapp`                                                                              | アプリ内ビューアで読まれたPV（`gnf:analytics` 系） |
| `traffic_partner`    | `gunosy` / `newspass` / `au_service_today` / `smartnews` / `allabout` / `trill` / `unknown` | 両方                                               |
| `traffic_partner_ua` | 例: `Gunosy/1.0`                                                                            | サイト側で判定できなかったときのみ                 |

`content_group` は GA4 の**標準ディメンション**なので管理画面での設定は不要。
**「アプリ内で読まれたPVが何%か」はこれだけで分かる。**

## GA4 管理画面で必要な設定（1回だけ）

`traffic_partner` / `traffic_partner_ua` はカスタムディメンションなので登録が必要。
**登録した時点以降のデータにしか適用されない**ので、デプロイ後すぐに登録すること。

管理 > データの表示 > カスタム定義 > カスタム ディメンションを作成

| ディメンション名 | 範囲     | イベント パラメータ  |
| ---------------- | -------- | -------------------- |
| 流入パートナー   | イベント | `traffic_partner`    |
| 流入パートナーUA | イベント | `traffic_partner_ua` |

## 構成ファイル

| ファイル                              | 役割                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `src/lib/analytics/traffic-source.js` | 判定とパラメータ組み立て（SvelteKit 非依存）           |
| `src/lib/ga.ts`                       | サイト側。`page_view` にパラメータを添える             |
| `src/lib/rss/gunosyFeed.js`           | フィード側。`gnf:analytics` 系をアプリごとに出し分ける |
| `tests/traffic-source.test.mjs`       | 判定のテスト（`pnpm run test:traffic`）                |

## サイト側の判定の作り

1. `navigator.userAgent` にアプリ名（`Gunosy` / `Gunosy-Newspass` / `Gunosy-Servicetoday` 等）があれば採用
2. 無ければ `document.referrer` のホスト名で判定
3. どちらでも決まらなければ `unknown`。このときだけ UA の手がかりを添える

**確実に一致したときだけ値を設定する。** 迷ったら何も付けない
（検索流入などを取り違えてデータを汚さないため）。

判定結果は `sessionStorage`（キー `nb_traffic_partner`）に持ち、セッション中は使い回す。
2ページ目以降は `document.referrer` が自サイトになり判定できなくなるため。

### `traffic_partner_ua` について

アプリ内ブラウザの User-Agent が実測できていないので、判定できなかった UA から
**`名前/バージョン` 形式のトークンだけ**を抜き出して送る（`Gunosy/1.0`、`FBAN/FBIOS FBAV/470.0` など）。

- 素のブラウザ（Safari / Chrome / Edge）では空文字になり、パラメータ自体を送らない
- 端末の型番（`SC-52B` など）はスラッシュを含まないので拾わない
- GA4 のイベントパラメータ上限に合わせて100文字で切り詰める

GA4 でこの値の分布を見て、新しいアプリの判定パターンを
`PARTNER_UA_PATTERNS` に足していく運用を想定している。

### 安全側の作り

`src/lib/ga.ts` の `resolveTrafficParams()` は全体を `try/catch` で囲んでいる。
`loadGtagOnce()` / `sendPageView()` は `+layout.svelte` の `onMount` から呼ばれるため、
ここで例外が出るとメニュー制御・スクロール制御・サイドレール広告の初期化まで止まる。
判定に失敗した場合は空オブジェクトを返し、**これまでどおりの `page_view` を送る**。

`sessionStorage` はプライベートモードや Cookie ブロック時に参照自体が例外を投げるため、
読み書きそれぞれを `try/catch` で囲んでいる。

## 確認方法

デプロイ後1〜2日で GA4 の探索から:

1. ディメンション「コンテンツ グループ」で `site` と `gunosy_inapp` の**表示回数の比**を見る
   → 「ユーザーは増えたのに広告収益が伸びない」の原因が数字で確定する
2. ディメンション「流入パートナー」で媒体別の内訳を見る
3. 「流入パートナーUA」で `unknown` の中身を見て、判定パターンを追加する
