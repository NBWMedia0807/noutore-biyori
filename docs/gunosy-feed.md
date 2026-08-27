# GunosyFeed 連携（グノシー / ニュースライト / auサービスToday）

Gunosy とのコンテンツパートナー契約に伴う記事連携用 RSS フィードの仕様と運用メモ。

- **フィードURL**: `https://noutorebiyori.com/feed/gunosy`
- **準拠仕様**: GunosyFeed 仕様書 ver 3.2.4（2026年3月13日版）
- **準拠ガイドライン**: Gunosy / ニュースライト / auサービスToday コンテンツ掲載ガイドライン
- **配信先**: このフィード1本で「グノシー」「ニュースライト」「auサービスToday」の3アプリに連携される

## 構成ファイル

| ファイル                                | 役割                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| `src/routes/feed/gunosy/+server.ts`     | 配信エンドポイント。Sanity 取得と HTTP 応答のみ       |
| `src/lib/rss/gunosyFeed.js`             | XML 組み立ての本体。SvelteKit 非依存の純粋モジュール  |
| `src/lib/queries/rssGunosy.groq.js`     | Sanity から記事を取得する GROQ クエリ                 |
| `scripts/validate-gunosy-feed.mjs`      | 仕様書・ガイドラインのセルフチェッカー（CLI）         |
| `scripts/fixtures/gunosy-feed-docs.mjs` | セルフチェック用のサンプル記事                        |
| `tests/gunosy-feed.test.mjs`            | 仕様適合テスト（37件）                                |
| `static/logo-wide.png`                  | `gnf:wide_image_link` 用の横長ロゴ（192×44px / PNG）  |
| `static/gunosy-channel-banner.png`      | チャンネル誘導バナー（750×420px / PNG・グノシー専用） |

XML の組み立てを `+server.ts` から切り出しているのは、Sanity にもネットワークにも触れずに
フィードの中身をテスト・検証できるようにするため。

## 出力する要素

### channel

| 要素                  | 値                                           | 備考                                |
| --------------------- | -------------------------------------------- | ----------------------------------- |
| `title`               | 脳トレ日和                                   | 必須                                |
| `link`                | `https://noutorebiyori.com/`                 | 必須                                |
| `description`         | 毎日更新。楽しく脳を鍛える無料の脳トレクイズ | 必須・**35文字以内**（現在22文字）  |
| `language`            | ja                                           |                                     |
| `copyright`           | © {年} 脳トレ日和                            |                                     |
| `ttl`                 | 15                                           | 更新間隔の目安（分）                |
| `lastBuildDate`       | 生成時刻（RFC822 / +0900）                   |                                     |
| `image`               | `logo.png`（1024×1024）                      | 必須・正方形 120×120px 以上         |
| `gnf:wide_image_link` | `logo-wide.png`（192×44）                    | 必須・**縦44px 固定**、横100〜550px |

> `item` と `lastBuildDate` 以外の channel 要素は**初回のフィード登録時にしか読まれない**。
> 後から変更する場合は media@gunosy.com への連絡が必要（仕様書 channel の注記）。

### item

| 要素                                                      | 内容                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `title`                                                   | 記事タイトル                                                                  |
| `link`                                                    | カテゴリ別 canonical URL（`/category/{cat}/{slug}`）。256文字以上は配信しない |
| `guid`                                                    | `noutorebiyori-{Sanity の _id}`。`isPermaLink="false"`                        |
| `content:encoded`                                         | 記事全文（CDATA）。問題・ヒント・解答をすべて含む                             |
| `media:status`                                            | `state="active"`                                                              |
| `pubDate`                                                 | 公開日（RFC822 / +0900）                                                      |
| `dc:creator`                                              | 記事の著者。未設定なら「脳トレ日和 編集部」                                   |
| `gnf:modified`                                            | 更新日（RFC822 / +0900）。`max(_updatedAt, publishedAt)`                      |
| `enclosure`                                               | 問題画像→メイン画像→解答画像の順で1件。`type="image/jpeg"` `length="0"`       |
| `gnf:relatedLink`                                         | 関連記事 最大3件（`thumbnail` は 320×240 / 4:3）                              |
| `gnf:analytics_gn` / `gnf:analytics` / `gnf:analytics_st` | GA4 の gtag スニペット（アプリごとに1つずつ）                                 |

仕様書 ver 3.2 で `item` から `description` / `gnf:category` / `gnf:keyword` が削除されたため、
これらは出力していない。

> **`enclosure` の `type` について**: 仕様書の本文には「type属性はJPEGならjpg、PNGならpngと指定」
> とある一方、同じ表の用例は `type="image/jpeg"` になっている。RSS 2.0 の enclosure は MIME タイプを
> 取る仕様であり、仕様書の用例にも一致するため `image/jpeg` を出力している。
> 画像は Sanity の URL Builder で `fm=jpg` を明示しているので、常に JPEG になる。
> 公式バリデータがここで警告を出した場合は `jpg` に切り替える
> （`src/lib/rss/gunosyFeed.js` の `buildItemXml` 1か所）。

## 仕様書対応で押さえているポイント

- **名前空間**: `gnf` / `content` / `dc` / `media` の4つを `<rss>` に指定（指定漏れが多い項目）
- **文字コード**: UTF-8、BOM なし
- **URLスキーム**: すべて HTTPS
- **エスケープ**: CDATA で囲まない箇所は `&` `"` `'` `<` `>` を実体参照に置換
- **日付**: RFC822（`Mon, 15 Jun 2015 09:00:00 +0900`）。タイムゾーンは +0900 で統一
- **guid**: Sanity の `_id` を使う。スラッグやカテゴリを変更しても値が変わらず、URL 形式でもない
- **10日ルール**: `pubDate` が10日より過去の記事は取り込まれないため、フィードにも載せない。
  ただし公開が途切れてフィードが空になるのを避けるため、10日以内が5件未満のときは
  新着5件までを残す（`MIN_ITEMS`）
- **本文HTML**: 文章はすべて `<p>`、画像は `<figure><img><figcaption>`、
  `<script>` と `style` 属性は使わない、`<br />` は連続させない
- **箇条書きは `<p>` で出す**: `<ul><li>` は使わず、行頭に `・` / `1. ` を付けた `<p>` にする。
  公式バリデータが `<li>` 直下のテキストを
  「【注意】`<p>`タグで囲まれていないテキストが存在します」として指摘するため（実測で確認）。
  テキストが `<p>` / `<h1>`〜`<h6>` / `<figcaption>` のいずれかに収まっていれば指摘されない
- **画像**: サイトロゴや「NO IMAGE」など本文と補完関係のない画像は enclosure にも本文にも入れない。
  記事に画像が無い場合は `enclosure` ごと省略する（アプリ側の既定画像が使われる）
- **`gnf:modified` は公開日でクランプ**: Sanity の `_updatedAt` は「最後に編集した時刻」なので、
  前日に記事を作って翌朝公開する運用だと `_updatedAt < publishedAt` となり
  「更新日が公開日より前」という不自然な値になる。`max(_updatedAt, publishedAt)` を出力する。
  公開後の編集は `_updatedAt` がそれより後になるため、Gunosy 側の更新検知には影響しない

## コンテンツ掲載ガイドライン対応

- **本文中のリンクを出力しない**（ガイドライン 2.3.1 ⑤⑥）。
  本文に設定できるリンクは「1段落目と2段落目の間に1本のみ」かつ自社ドメインに限られるため、
  Sanity 側でリンクマークが付いていてもテキストとして出力する。
  関連記事は `gnf:relatedLink` 要素だけで配信する。
- **広告枠を出力しない**。SmartNews 用フィード（`/feed/smartnews`）が出している
  `snf:advertisement` / `snf:sponsoredLink` 相当のものは GunosyFeed には載せない
  （ガイドライン 2.2.2 b：広告・記事広告ページへ誘導するリンクの禁止）。
- **記事の非公開化に追随する**。`reviewStatus` が `approved` 以外の記事、
  本文に「null」が残っている記事は `QUIZ_FEED_SAFE_FILTER` と同じ条件で除外する。
  関連記事に選ばれた記事も同じ条件で確認し、非公開のものは `gnf:relatedLink` から外す。

## 検証手順

### 1. ローカルのセルフチェック（デプロイ前）

```bash
pnpm run test:gunosy                  # 仕様適合テスト
pnpm run validate:gunosy              # サンプル記事から生成して検証
pnpm run validate:gunosy ./feed.xml   # 手元の XML を検証
```

`scripts/validate-gunosy-feed.mjs` は仕様書の各条件（必須要素・35文字制限・RFC822・
URL長・名前空間・禁止タグ・関連記事3件上限・エスケープ漏れなど）をローカルで確認する。
エラーが1件でもあれば終了コード1を返す。

### 2. 公式バリデータチェックツール

<https://feed-validator.newspass.jp/>

このツールには入力欄が2つある。

| 入力欄                             | 使いどころ                                                   |
| ---------------------------------- | ------------------------------------------------------------ |
| **RSSのURLを入力してチェックする** | デプロイ後。公開URLを取得しに行くので、未公開だと 404 になる |
| **XMLを直接チェックする**          | デプロイ前。生成した XML を貼り付ければそのまま検証できる    |

デプロイ前に確認する場合は、ローカルの実データを貼り付けるのが本番相当になる。

```bash
pnpm dev
# 別ターミナルで
curl -s http://localhost:5173/feed/gunosy > gunosy-feed.xml
pnpm run validate:gunosy ./gunosy-feed.xml   # 先に手元で潰す
cat gunosy-feed.xml | pbcopy                 # 「XMLを直接チェックする」に貼る
```

デプロイ後は URL 欄に `https://noutorebiyori.com/feed/gunosy` を入力する。
いずれの場合も**エラー・警告が0件**であることと、プレビューで記事の表示イメージが
崩れていないことを確認する。

```bash
# デプロイ後、公開URLに対してセルフチェックをかけることもできる
pnpm run validate:gunosy https://noutorebiyori.com/feed/gunosy
```

> 公式ツールの表示イメージは「ニュースライト」「auサービスToday」のもの。
> 「グノシー」では一部表現が異なる（キャプション非表示、`iframe`・`table` 非対応など）。

## チャンネル誘導バナー（グノシー専用）

グノシーアプリの「チャンネルホーム」に掲載される、チャンネルをフォローさせるためのバナー。
掲載枠は4つで、どの媒体を載せるかは Gunosy 側が決める（定期更新）。ニュースライトと
auサービスToday にはこの機能がない。

- **入稿先**: media@gunosy.com へメール添付
- **ファイル**: `static/gunosy-channel-banner.png`（750×420px / PNG）
- **公開URL**: <https://noutorebiyori.com/gunosy-channel-banner.png>
- **入稿は1種類のみ**（複数パターンは不可）

仕様で「メディア名・ロゴ・メディア概要をバナー内に明記」と定められているため、バナーには
以下をすべて入れている。

| 要素           | バナー内の文言                                                       |
| -------------- | -------------------------------------------------------------------- |
| ロゴ           | サイトロゴの脳マーク（`static/logo.png` と同じ意匠）                 |
| メディア名     | 脳トレ日和                                                           |
| キャッチコピー | 毎日更新！ 楽しく続ける脳トレ習慣                                    |
| メディア概要   | 間違い探し・難読漢字・計算パズルなど／無料の脳トレクイズを毎日お届け |

差し替える場合は同じサイズ（750×420px、PNG または JPG）で `static/` のファイルを置き換え、
改めて media@gunosy.com へ送る。ブランドカラーは背景 `#fefae9`／アクセント `#f3a008`／
文字 `#5a3b1c`。

## Gunosy 側への連絡が必要なタイミング

- **初回連携時**: フィードを用意した旨を Gunosy に連絡すると、先方からのアクセスが始まる
- **フィードURL・形式の変更時**: 申請なしに変更すると取り込みが止まる可能性がある
- **channel 要素（タイトル・ロゴ・説明文など）の変更時**: 初回登録時の値が使われ続けるため、
  media@gunosy.com または問い合わせフォームへ連絡が必要

## 取得元の User-Agent

エンドポイントはアクセス元の User-Agent をログに出力している。
Gunosy からの取得は以下の文字列を含む（最短1分間隔、GET、上限10秒）。

| アプリ          | User-Agent                |
| --------------- | ------------------------- |
| グノシー        | `Gunosy/1.0`              |
| ニュースライト  | `Gunosy-Newspass/1.0`     |
| auサービスToday | `Gunosy-Servicetoday/1.0` |
