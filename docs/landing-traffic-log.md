# 着地トラフィックの実測ログ

GunosyRSS 連携で増えた流入のうち、GA4 で `(direct) / (none)` と `(not set)` に
落ちているものの正体を確定させるための一時的な計測。

| ファイル                        | 役割                                            |
| ------------------------------- | ----------------------------------------------- |
| `src/hooks.server.js`           | 環境変数の判定と `console.log` だけの薄いフック |
| `src/lib/server/landing-log.js` | 記録対象の判定とログ整形（SvelteKit 非依存）    |
| `tests/landing-log.test.mjs`    | 判定・整形のテスト（`pnpm run test:landing`）   |

## 何を記録しているか

サイトへの入口となる **HTML ドキュメントのリクエストだけ**を1行1件で記録します。
SPA 内のページ遷移はサーバーにドキュメント要求を出さないため、ここに出るのは
実質「外部からの着地」と「リロード」だけです。

除外しているもの: `/api/` `/feed/` `/rss/` `/_app/` `/.well-known/`、
`robots.txt` / `sitemap.xml` / `favicon.ico`、拡張子付きの静的アセット、
`Sec-Fetch-Dest` が `document` 以外のリクエスト、データ要求・サブリクエスト、非 GET。

**IP アドレスやクッキーなど、個人を特定しうる情報は記録していません。**

## ログの見方

Vercel のダッシュボード > プロジェクト > **Logs** で `[landing]` を検索します。

```
[landing] {"path":"/category/kanji-quiz/xxx","query":"","guess":"gunosy","ua":"Mozilla/5.0 ... Gunosy/1.0","ref":"","sfs":"none","sfm":"navigate","lang":"ja-JP"}
```

| キー    | 意味                                                                          |
| ------- | ----------------------------------------------------------------------------- |
| `path`  | 着地したページ                                                                |
| `query` | クエリ文字列（UTM が付いていればここに出る）                                  |
| `guess` | UA / Referer からの流入元推測。目視用の目印で、計測の判定には使っていない     |
| `ua`    | User-Agent（200文字で切り詰め）                                               |
| `ref`   | Referer。**空 = GA4 で direct 扱いになっているもの**                          |
| `sfs`   | `Sec-Fetch-Site`。`none` = 直打ち/アプリからの起動、`cross-site` = 外部リンク |
| `sfm`   | `Sec-Fetch-Mode`。通常のページ遷移なら `navigate`                             |
| `lang`  | `Accept-Language`                                                             |

### 見るべきポイント

1. **`ref` が空 かつ `sfs` が `none`** の行 — これが GA4 の `(direct) / (none)` の正体。
   その `ua` に `Gunosy` / `Gunosy-Newspass` / `Gunosy-Servicetoday` が入っていれば、
   **UA 判定でキャンペーンを付与できる**（フィードの `link` に UTM を付けなくて済む）。
2. `ua` に何の手がかりも無い場合 — UA 判定は使えないので、フィードの `link` へ
   UTM を付ける方式を Gunosy（media@gunosy.com）に確認する必要がある。
   ただし `+layout.svelte` の `noindexPage` 判定でクエリ付き URL は `noindex,follow`
   になる点に注意。
3. `guess` の分布 — グノシー / ニュースライト / auサービスToday のどれが主力かの目安。

## 止め方・消し方

恒久的に必要なログではありません。

- **一時停止**: Vercel の Environment Variables に `LANDING_LOG=off` を追加（再デプロイ不要）
- **撤去**: `src/hooks.server.js` / `src/lib/server/landing-log.js` /
  `tests/landing-log.test.mjs` と `package.json` の `test:landing` を削除

切り分けが済み、GA4 側の識別方法（UA 判定 or UTM）が決まった時点で撤去してください。
