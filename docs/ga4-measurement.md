# GA4 計測の設計（本体サイト / SmartNews SmartView / グノシー系アプリ内ビューア）

脳トレ日和の GA4（測定ID `G-855Y7S6M95`）は、本体サイトと配信先アプリの
アプリ内ビューアの3か所から同じプロパティにヒットを送っている。
それぞれが何を送っているか、GA4 でどう分離するかをまとめる。

- **対象プロパティ**: 脳トレ日和（`G-855Y7S6M95`。本体・SmartNews・グノシー系で共通）
- **計測定義の切り替え日**: 本ドキュメントの変更をデプロイした日（下の「過去データの扱い」参照）

---

## 1. 何が問題だったか

GA4 の「表示回数」は `page_view` と `screen_view` だけを数える指標。
ところが SmartNews SmartView とグノシー系アプリ内ビューアは、
**noutorebiyori.com を1バイトもロードしていない**のに、
配信フィードに載せた計測タグが素の `gtag('config', ID)` になっていたため、
アプリ内で本文を読んだだけで `page_view` が飛んでいた。

その `page_view` の `page_location` は記事の canonical URL なので、
ホスト名も `noutorebiyori.com` として記録される。
結果として GA4 ホームの「表示回数」＝ 本体サイトの PV ではなくなり、
ホスト名でもページパスでも切り分けられない状態だった。

2026/09/11 の実績で言うと、

| GA4 セッションの参照元 / メディア | セッション | 実体（推定）                                       |
| --------------------------------- | ---------: | -------------------------------------------------- |
| `smartnews.com / referral`        |     85,911 | SmartView のアプリ内閲覧 + 本体サイトへの実遷移    |
| `(direct) / (none)`               |      8,004 | 大半がグノシー系アプリ内ビューア（Referer が無い） |
| `gunosy / referral`               |        831 | 配信URLの UTM が効いた**本体サイトへの実遷移**     |

グノシー管理画面のクリック実績（グノシー 5,025 / ニュースライト 127 /
auサービスToday 2,691 = 合計 7,843）と `(direct)/(none)` の 8,004 がほぼ一致する。
「Referer が失われて direct に落ちている」のではなく、
**アプリ内ビューアの閲覧そのものが `page_view` として計上されていた**のが主因。

---

## 2. 修正後のイベント設計

| 面                         | イベント名            | `content_surface` | `distribution_platform` | campaign_source / medium  |
| -------------------------- | --------------------- | ----------------- | ----------------------- | ------------------------- |
| 本体サイト（Web ページ）   | `page_view`           | `website`         | （付けない）            | 流入元そのまま            |
| SmartNews SmartView        | `smartview_page_view` | `smartview`       | `smartnews`             | `smartnews` / `smartview` |
| グノシー系アプリ内ビューア | `gunosy_page_view`    | `gunosy_app`      | `gunosy`                | `gunosy` / `app_view`     |

アプリ内ビューアでは `send_page_view: false` を指定して自動 `page_view` を止め、
代わりに専用イベントを送る。閲覧数の情報は専用イベントのイベント数として残るので失われない。

専用イベントに載せているパラメータ:

| パラメータ              | 例                               |
| ----------------------- | -------------------------------- |
| `content_surface`       | `smartview` / `gunosy_app`       |
| `distribution_platform` | `smartnews` / `gunosy`           |
| `article_path`          | `/category/kanji-quiz/kanji-001` |
| `article_title`         | 記事タイトル                     |
| `article_slug`          | `kanji-001`                      |
| `article_category`      | `漢字クイズ`                     |
| `page_location`         | 記事の canonical URL（UTM なし） |
| `page_title`            | 記事タイトル                     |

> `category` ではなく `article_category` にしているのは、GA4 の e コマース用
> `item_category` 系パラメータと紛らわしくならないようにするため。

### 「アプリ内の閲覧」か「本体サイトの閲覧」かの判定

**イベント名だけで 100% 確実に分かる。** 計測タグが動く場所そのものが違うためで、
User-Agent の推定にも参照元の判定にも依存しない。

| イベント名            | どこで起きたか                                        | 本体サイトの PV か |
| --------------------- | ----------------------------------------------------- | ------------------ |
| `smartview_page_view` | SmartNews アプリ内（SmartView）。本体サイトは未ロード | **いいえ**         |
| `gunosy_page_view`    | グノシー系アプリ内ビューア。本体サイトは未ロード      | **いいえ**         |
| `page_view`           | noutorebiyori.com のページを実際にロードした          | **はい**           |

さらに本体サイトの `page_view` には `app_webview` を付けており、
**その1 PV がどのアプリのアプリ内ブラウザで開かれたか**が内訳として分かる。

| `app_webview`      | 意味                                           |
| ------------------ | ---------------------------------------------- |
| `smartnews`        | SmartNews のアプリ内ブラウザで本体サイトを表示 |
| `gunosy`           | グノシーのアプリ内ブラウザで本体サイトを表示   |
| `newspass`         | ニュースライトのアプリ内ブラウザ               |
| `au_service_today` | auサービスToday のアプリ内ブラウザ             |
| `trill`            | TRILL のアプリ内ブラウザ                       |
| `browser`          | 通常のブラウザ（判定できなかったものを含む）   |

これを入れた理由は、「セッションの参照元 / メディア」がセッション単位の属性だから。
SmartView で記事を読んだ直後に本体サイトへ遷移して同一セッションが続くと、
本体サイトの PV まで SmartView 側の参照元（`smartnews / smartview`）に寄ってしまい、
参照元だけでは分けられない。`app_webview` は**イベント単位**なので、
セッションの切れ方に左右されずその1 PV 単独で判定できる。

> **`app_webview` の限界**: これは User-Agent の部分一致による推定なので確実ではない。
> アプリ内ブラウザが UA に自分の名前を載せなければ `browser` になる。
> つまり `browser` は「アプリ内ブラウザではない」ことの証明にはならない。
> 一番大事な「アプリ内ビューアか本体サイトか」の切り分けは必ず**イベント名**で行うこと。
> 判定ロジックは `src/lib/analytics/appWebview.js`。

### 参照元（セッションの参照元/メディア）の分け方

アプリ内ビューアのヒットは Referer が無かったり（→ `(direct)/(none)`）
アプリのドメインが付いたり（→ `smartnews.com / referral`）して、
「本体サイトへ実際に遷移した流入」と見分けが付かない。
そこで計測タグ側で `campaign_source` / `campaign_medium` を明示している。

| GA4 の参照元 / メディア     | 意味                                                     |
| --------------------------- | -------------------------------------------------------- |
| `smartnews / smartview`     | SmartView の**アプリ内閲覧**（本体サイトのPVではない）   |
| `smartnews / recirculation` | SmartView の**回遊枠**から本体サイトへ遷移した流入       |
| `smartnews.com / referral`  | SmartNews から本体サイトへ遷移した流入のうち、回遊枠以外 |
| `gunosy / app_view`         | グノシー系の**アプリ内閲覧**（本体サイトのPVではない）   |
| `gunosy / referral`         | 配信URLの UTM 経由で**本体サイトへ遷移**した流入         |
| `gunosy.com / referral`     | Web版グノシー（ブラウザ）からのリンク流入                |

SmartView の回遊枠（記事下の広告枠・本文末リンク・関連記事枠）のリンクには
`utm_source=smartnews` / `utm_medium=recirculation` / `utm_content=枠名` を付けている。
**SmartNews からの実質的な送客数はこの `smartnews / recirculation` で見る**。
枠ごとの内訳は `utm_content`（`sponsoredlink` / `bodylink` / `relatedlink`）で分かれる。
詳細は `docs/smartnews-recirculation.md`。

`gunosy / (not set)` のような表記揺れは、`utm_source` だけが残って `utm_medium` が
欠けたセッションで発生する。本修正でアプリ内閲覧が `gunosy / app_view` に分離されるため、
残る `(not set)` の量で原因の切り分けがしやすくなる（→ 6. の確認手順）。

---

## 3. 実装ファイル

| ファイル                                      | 役割                                                              |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `src/lib/analytics/surfaces.js`               | `content_surface` などの共通定数                                  |
| `src/lib/rss/feedAnalytics.js`                | アプリ内ビューア用 GA4 スニペットの組み立て（SmartNews / Gunosy） |
| `src/routes/feed/smartnews/+server.js`        | `<snf:analytics>` に SmartView 用スニペットを出力                 |
| `src/lib/rss/gunosyFeed.js`                   | `<gnf:analytics*>` に グノシー用スニペットを出力                  |
| `src/lib/ga.ts`                               | 本体サイトの gtag 読み込みと `page_view` 送信                     |
| `src/lib/analytics/pageViewTracker.js`        | `page_view` の二重送信ガード                                      |
| `src/lib/analytics/measurementEnvironment.js` | 本番ホスト名以外（プレビュー・ローカル）を計測しない判定          |
| `src/lib/analytics/appWebview.js`             | 本体サイト PV の内訳（どのアプリ内ブラウザで開いたか）の判定      |
| `src/lib/utils/feedUtm.js`                    | 配信URLへの UTM 付与（Gunosy / TRILL / Merkystyle）               |

テスト:

```bash
pnpm run test:feed-analytics   # 計測スニペットの中身
pnpm run test:smartnews        # SmartNews フィード全体（配信仕様の固定 + 計測）
pnpm run test:gunosy           # GunosyFeed 全体（仕様適合 + 計測）
pnpm run test:page-view        # 本体サイトの page_view 送信ルール
pnpm run test:feed-utm         # 配信URLの UTM
```

---

## 4. GA4 管理画面で必要な設定（コードだけでは完結しない）

`content_surface` などは**カスタムディメンションに登録しないとレポートに出てこない**。
GA4 管理画面 → **管理 → データの表示 → カスタム定義 → カスタムディメンションを作成**
で、以下をすべて **範囲: イベント** で登録する。

| #   | ディメンション名     | 範囲     | イベントパラメータ      |
| --- | -------------------- | -------- | ----------------------- |
| 1   | コンテンツ表示面     | イベント | `content_surface`       |
| 2   | 配信プラットフォーム | イベント | `distribution_platform` |
| 3   | 記事パス             | イベント | `article_path`          |
| 4   | 記事タイトル         | イベント | `article_title`         |
| 5   | 記事スラッグ         | イベント | `article_slug`          |
| 6   | 記事カテゴリ         | イベント | `article_category`      |
| 7   | アプリ内ブラウザ     | イベント | `app_webview`           |

注意点:

- カスタムディメンションは**登録した日以降のデータにしか適用されない**（遡及しない）。
  デプロイと同じ日に登録しておくこと。
- イベント範囲のカスタムディメンションはプロパティあたり50個まで。現状の使用数を確認してから登録する。
- 登録後、レポートに値が出るまで最大24〜48時間かかる。
  すぐ確認したいときは **管理 → DebugView**、または探索の「過去30分」を使う。
- `smartview_page_view` / `gunosy_page_view` を「キーイベント（旧コンバージョン）」に
  登録する必要はない。件数を見るだけならイベントのままでよい。

---

## 5. GA4 探索での見方（最終形）

**探索 → 空白 → 自由形式**で以下を作ると、1日単位で面ごとの数字が並ぶ。

- ディメンション: `イベント名`、`セッションの参照元 / メディア`、`コンテンツ表示面`
- 指標: `イベント数`、`表示回数`、`セッション`

| 見たいもの                 | 条件                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 脳トレ日和 本体サイト PV   | `イベント名 = page_view`（＝ GA4 ホームの「表示回数」と一致）                                                                        |
| SmartNews SmartView 閲覧数 | `イベント名 = smartview_page_view` のイベント数                                                                                      |
| SmartNews → 本体サイト PV  | `イベント名 = page_view` かつ `セッションの参照元 / メディア = smartnews / recirculation`（回遊枠以外は `smartnews.com / referral`） |
| グノシー系アプリ内閲覧数   | `イベント名 = gunosy_page_view` のイベント数                                                                                         |
| Gunosy系 → 本体サイト PV   | `イベント名 = page_view` かつ `セッションの参照元 = gunosy`（medium は referral）                                                    |
| Google Organic             | `イベント名 = page_view` かつ `参照元 / メディア = google / organic`                                                                 |
| Direct                     | `イベント名 = page_view` かつ `参照元 / メディア = (direct) / (none)`                                                                |

記事単位で SmartView の閲覧数を見たいときは、
ディメンションに `記事パス`（`article_path`）、指標に `イベント数` を置き、
`イベント名 = smartview_page_view` でフィルタする。

### 「App内か本体サイトか」を1枚で見る（推奨の探索）

- ディメンション: `イベント名`、`アプリ内ブラウザ`（`app_webview`）
- 指標: `イベント数`
- フィルタなし

これだけで次の表が出る。カスタムディメンションの登録は `app_webview` の1つで足りる
（`イベント名` は GA4 標準のディメンション）。

| イベント名            | アプリ内ブラウザ | 読み方                                                |
| --------------------- | ---------------- | ----------------------------------------------------- |
| `smartview_page_view` | （空）           | **SmartNews アプリ内**での記事閲覧                    |
| `gunosy_page_view`    | （空）           | **グノシー系アプリ内**での記事閲覧                    |
| `page_view`           | `smartnews`      | SmartNews のアプリ内ブラウザで開いた**本体サイト PV** |
| `page_view`           | `gunosy` ほか    | グノシー系のアプリ内ブラウザで開いた**本体サイト PV** |
| `page_view`           | `browser`        | 通常ブラウザでの**本体サイト PV**                     |

`page_view` の行を全部足したものが本体サイト PV の合計（＝ GA4 ホームの「表示回数」）。

---

## 6. 配信URLの UTM（Gunosy / TRILL / Merkystyle）

`src/lib/utils/feedUtm.js` で、配信フィードの記事URLに
`utm_source` / `utm_medium=referral` / `utm_campaign=feed` を付けている（2026-09-08 リリース）。
これは**アプリ内ビューアではなく、本体サイトへ実際に遷移したときの参照元**を残すためのもの。

- Gunosy はメイン記事の `<link>` と `gnf:relatedLink` の両方に UTM を付けている。
- SmartNews には付けていない（SmartFormat 仕様上、canonical 相当の `<link>` に
  計測パラメータを付けるのは推奨されないため）。
- グノシー / ニュースライト / auサービスToday は**同一フィード・同一URL**を共有するため、
  `utm_source` は3アプリまとめて `gunosy` になる。アプリ別の内訳はグノシー管理画面のクリック実績で見る。

本番に UTM 付きURLが出ているかの確認:

```bash
curl -s https://noutorebiyori.com/feed/gunosy | grep -o '<link>[^<]*</link>' | head -5
# → https://noutorebiyori.com/category/.../...?utm_source=gunosy&amp;utm_medium=referral&amp;utm_campaign=feed
```

着地側の確認は Vercel の Logs で `[landing]` を検索する（`docs/landing-traffic-log.md`）。
`query` に `utm_source=gunosy` が入っていれば、Gunosy 側でクエリが削られていないことの実測になる。

---

## 7. 本体サイト側の計測ルール

- gtag の読み込みは `$lib/ga.ts` の `loadGtagOnce()` の1経路のみ（`app.html` や
  `+layout.svelte` に GA4 タグを直書きしない）。二重読み込み＝二重計測の原因になる。
- `send_page_view: false` を指定し、`page_view` は初回表示（`onMount`）と
  SPA 遷移（`afterNavigate`）から `sendPageView()` で明示的に送る。
- 同じパスへの1秒以内の再送はトラッカー側で弾く（`pageViewTracker.js`）。
  クエリ違い（UTM 付き）や、間を空けた同一パスの再訪は別 PV として送る。
- 本番ホスト名（`noutorebiyori.com` / `www.noutorebiyori.com`）以外では計測しない。
  Vercel のプレビューデプロイやローカル開発のアクセスが本番プロパティに混ざるのを防ぐ。

---

## 8. 過去データの扱い

GA4 は過去に受信したデータを書き換えられないため、**修正のデプロイ日を境に定義が変わる**。
日次で比較するときはこの境界に注意すること。

| 期間             | 「表示回数」の意味                                                       |
| ---------------- | ------------------------------------------------------------------------ |
| デプロイ日より前 | 本体サイト PV + SmartNews SmartView 閲覧 + グノシー系アプリ内閲覧 が混在 |
| デプロイ日以降   | **本体サイト PV のみ**（アプリ内閲覧は専用イベントに分離）               |

デプロイ日以降、GA4 ホームの「表示回数」は**数字としては大きく下がる**が、
これは流入が減ったのではなく、これまで混ざっていたアプリ内閲覧が分離されたため。
アプリ内閲覧を含めた総閲覧数を見たいときは、
`page_view` + `smartview_page_view` + `gunosy_page_view` のイベント数を合計する。

実際のデプロイ日を確定したら、この行に追記すること:

- 2026-09-XX: SmartView / グノシー系アプリ内閲覧を `page_view` から分離（本ドキュメントの設計を適用）
