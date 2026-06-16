# サイト最適化 定期診断レポート（2026-06）

対象: 脳トレ日和（SvelteKit + Sanity + Vercel / AdSense・themoneytizer 収益化）
診断範囲: SEO / 表示スピード / ページトップ復元 / 広告とコンテンツの隙間 / UI・UX / 収益（配信）最適化 / 横展開・コード健全性

> 補足: 本レポートは「現状の良い点」と「改善案」を併記しています。コードベースは既に高度に最適化されており、以下は**さらなる伸びしろ**の指摘です。各指摘には `ファイル:行` と重要度（高/中/低）を付与しています。

---

## サマリー（優先度順）

### 最優先（低リスク・高効果のクイックウィン）

| # | 項目 | 重要度 | 該当箇所 |
|---|------|--------|----------|
| 1 | `<title>` にサイト名が**二重付与**（全ページ） | 高 | `src/lib/components/SEO.svelte:32` ←→ `src/lib/seo.js:247-251` |
| 2 | 構造化データ `WebSite`/`Organization` の**二重出力＆定義不一致** | 高 | `src/lib/components/SEO.svelte:42-84` ←→ `src/lib/seo.js:270-272` |
| 3 | sitemap に **noindex の解答ページ**を掲載＋**リダイレクト元URL**を掲載 | 中 | `src/routes/sitemap.xml/+server.js:130,137` |
| 4 | 解答ページ／「さらにもう一問」画像が**無変換の原寸URL** | 高 | `src/routes/quiz/[...slug]/answer/+page.svelte:84-91,133-136`、`.../answer/+page.server.js:36` |
| 5 | `/quiz` 一覧の**全カードが同一のハードコード説明文** | 中 | `src/routes/quiz/+page.svelte:65,72-74` |

### 中（効果中・要設計）

| # | 項目 | 重要度 | 該当箇所 |
|---|------|--------|----------|
| 6 | 未使用の `popular` を毎回取得（Sanity コスト増） | 中 | `src/routes/+page.server.js:49-55`、`src/routes/category/[slug]/+page.server.js:55-63,258-263` |
| 7 | デスクトップのインフィード広告がゼロ／サイドレールが `≥1540px` 限定 | 中 | `src/lib/components/ArticleFeed.svelte:70-74`、`src/routes/+layout.svelte:137` |
| 8 | 固定レクタングル枠で高さ予約が無く読込時に CLS | 中 | `src/lib/components/QuizDetailPage.svelte:203`、`.../answer/+page.svelte:80` |
| 9 | JSON-LD の SearchAction が指す `/quiz?q=` 検索が**未実装** | 中 | `src/lib/components/SEO.svelte:55-62` ←→ `src/routes/quiz/+page.server.js` |

### 低・健全性（横展開しやすい整理）

| # | 項目 | 重要度 | 該当箇所 |
|---|------|--------|----------|
| 10 | 旧分析ドキュメント・デバッグファイルの残置 | 低 | `analysis.md`, `todo.md`, `ui_ux_*.md`, `*_debug.*`, `sanity_upload.mjs` |
| 11 | 未使用コンポーネント `SideRailAd.svelte` | 低 | `src/lib/components/SideRailAd.svelte`（import されていない） |
| 12 | カテゴリ4ルートの重複＋Sanity スラッグ二重（kanji-quiz/nandoku-kanji） | 低 | `src/routes/category/{kanji-quiz,nandoku-kanji,number-quiz,business-manner}/` |
| 13 | `logo.png` が約1MB | 低 | `static/logo.png` |
| 14 | themoneytizer 連携の実態確認（ads.txt は有効だがコードは AdSense のみ） | 低 | `static/ads.txt:2`, `src/app.html:27-186` |

---

## 1. SEO対策

### 良い点（維持）
- ページ別 canonical、`max-image-preview:large` 等の robots、OGP/Twitter Card、NewsArticle/BreadcrumbList/FAQPage の構造化データ、RSS（SmartNews/Trill/Merkystyle）、IndexNow、画像 sitemap、カテゴリを含む新 canonical URL（`/category/[cat]/[slug]`）への 308 統合まで実装済み。土台は非常に強い。

### 課題と改善案

**[高] タイトルにサイト名が二重付与されている（全ページ）**
`createPageSeo()` は `appendSiteName`（既定 true）で `…｜脳トレ日和` を付与する（`src/lib/seo.js:247-251`）。その結果を受け取った `SEO.svelte` が再度 ` | 脳トレ日和` を付与する（`src/lib/components/SEO.svelte:32`）。
- 記事: `タイトル｜脳トレ日和 | 脳トレ日和`
- 解答: `タイトル｜正解｜脳トレ日和 | 脳トレ日和`
- TOP: `脳トレ日和｜…｜脳トレ日和`
→ SERP・ブラウザタブで冗長、タイトル長超過でキーワード希薄化。
**改善案**: タイトル合成を一本化する。`SEO.svelte` は受領した `title` をそのまま使う（`titleText = title || SITE_TITLE`）。サイト名付与は `seo.js` 側のみに統一。

**[高] 構造化データの `WebSite`/`Organization` が二重出力され、定義も食い違う**
`seo.js` が `WebSite`+`Organization` を含む配列を生成（`src/lib/seo.js:270-272`）し、それを受けた `SEO.svelte` が**自前の** `WebSite`+`Organization` を `@graph` に積んだ上で配列を追記する（`src/lib/components/SEO.svelte:42-84`）。同一 `@id` のノードが2つずつ出力され、しかも内容が異なる:
- ロゴ: `logo.png 1024²`（seo.js）vs `logo.svg 512²`（SEO.svelte）
- `sameAs`: 2件 vs 1件
- `SearchAction` は SEO.svelte 側のみ
**改善案**: グラフ生成元を一本化（`SEO.svelte` の baseGraph を撤去し `seo.js` に集約、あるいは逆）。`Organization` のロゴ・sameAs を1つの正にそろえる。

**[中] sitemap に noindex の解答ページと、リダイレクト元 URL を掲載**
- 解答ページは `noindex,nofollow`（`src/routes/+layout.svelte:95-96`）なのに sitemap に出力（`src/routes/sitemap.xml/+server.js:137`）。noindex URL の sitemap 掲載はクロールバジェットの無駄＋矛盾シグナル。
- 記事は canonical が `/category/[cat]/[slug]` だが、sitemap は旧 `/quiz/[slug]`（308 リダイレクト元）を出力（`:130`）。sitemap は最終 canonical を載せるべき。
**改善案**: 解答ページを sitemap から除外。記事は `category->slug` を取得して `/category/[cat]/[slug]` を出力。

**[低] 既定 OG 画像の不整合**: `site.js:9` は `logo.svg`、`SEO.svelte:35` は `logo.png`。1つに統一。
**[低] robots.txt** は最小構成で問題ないが、`Sitemap` 行のみ（現状で可）。

---

## 2. サイト表示スピード

### 良い点（維持）
- **Web フォント不使用**（システムフォントスタック `global.css:25`）→ フォント由来の遅延ゼロ。
- AdSense の preconnect/dns-prefetch/preload（`app.html:8-23`）、記事・一覧画像の AVIF/WebP + `width/height`（CLS なし）、ISR（`quiz` 系ルート）、CDN キャッシュヘッダ、IntersectionObserver による広告の遅延ロード。

### 課題と改善案

**[高] 解答ページ画像・「さらにもう一問」画像が無変換の原寸 Sanity URL**
- 解答画像: `quiz.answerImage.asset.url` を直貼り（`.../answer/+page.svelte:84-91`）。AVIF/WebP・リサイズ・srcset なし。
- 「さらにもう一問」: サーバが `"image": problemImage.asset->url`（原寸）を返し（`.../answer/+page.server.js:36`）、`<img>` に `width/height` も無い（CLS 要因）。
- 記事本文画像・一覧カードは `createSanityImageSet()` で最適化済みなのに、解答ページだけ退行している。
**改善案**: 解答画像・next-challenge 画像も `createSanityImageSet()`（`src/lib/utils/images.js`）経由に。**注意**: 現行 GROQ は `asset->{ url, metadata }` で参照を解決してしまい `urlFor` 用の `_ref/_id` が無い。プロジェクションに `asset->{ _id, url, metadata }` を加え、`_id` から `urlFor` でビルドする必要がある。共通の `<SanityImage>` コンポーネント化で再発防止を推奨。

**[中] 未使用の `popular` を毎回フェッチ**
TOP・カテゴリで `popular`（8〜12件・フル projection）を取得しているが、`.svelte` 側で `data.popular` を参照している箇所は**ゼロ**。カテゴリページでは OG 画像にも使われず完全に未使用（`src/routes/category/[slug]/+page.server.js:258-263,298`）。直近のコミット群（「Sanity API リクエスト数削減」）の方針とも整合する削減余地。
**改善案**: カテゴリの `popular` は削除。TOP は OG 画像用に最小限（`slug` と画像のみ）へ projection を縮小。

**[低] `logo.png` が約1MB**（`static/logo.png`）。OGP・各所で参照。200KB 以下へ圧縮。
**[低] preconnect 過多**: Google 系6オリジン（`app.html:9-14`）。接続コスト増。本当に初回描画に効く2〜3に絞るのも一案。

> 注: 事前評価では実機の Lighthouse/PSI 計測（モバイル）で LCP・CLS・TBT を採取し、上記修正の前後比較を推奨。

---

## 3. サイト遷移時のページトップ表示

### 評価: 良好（大きな改善不要）
`src/routes/+layout.svelte` で多層的に実装済み:
- `afterNavigate` で `window.scrollTo(top)`（ハッシュ遷移は除外）`:60-69`
- `history.scrollRestoration = 'manual'` で復元抑止 `:119-121`
- vignette/インタースティシャル広告閉鎖後の復帰 `forceScrollTop`（多段 setTimeout）`:128-161`
- タブ復帰（visibilitychange）時の補完 `:165-171`

### 軽微な改善
**[低] vignette 監視ポーリングが常時稼働**（`setInterval(checkVignette, 400)` `:161`）。レイアウトは原則アンマウントされないため実質常時実行。CPU/電池影響は軽微だが、`hashchange`/`popstate` 監視で足りるケースが多く、ポーリング間隔を広げる or 条件付き化の余地。

---

## 4. 広告とコンテンツの間の不自然な隙間

### 評価: ほぼ解決済み
- 未配信(unfilled)枠は `display:none` で完全折りたたみ（`AdSense.svelte:161-163`）。
- インフィード広告も未配信時にラッパーごと折りたたみ（`ArticleFeed.svelte:60-62`、直近コミットで対応済み）。
- 読込中の二重 flex gap を負マージンで相殺（`QuizDetailPage.svelte:443-445`、`answer/+page.svelte:385-387`）。

### 残課題
**[中] 固定レクタングル枠で高さ予約が無く、配信時に下方向シフト（CLS）**
「タイトル下 固定レクタングル」（slot `4170928887`）はサイズが概ね既知だが `data-ad-format="auto"` で高さ予約していないため、配信時に下のコンテンツが押し下げられる。これは「隙間」ではなく「読込時のガクつき(CLS)」。
**改善案**: 固定サイズ枠は最小高さ（例: 250〜280px）を予約 or `min-height` プレースホルダで CLS を抑制。レスポンシブ枠との両立に注意。

**[低] 負マージンのハードコード依存が脆い**: `-24px`（PC）/`-20px`（SP）が各ページの flex `gap` と一致している前提（`answer/+page.svelte:386,395`）。gap 変更時に二重余白が再発。CSS 変数で gap と相殺値を単一ソース化すると安全。

---

## 5. UI/UX・ユーザビリティ

### 良い点（維持）
- カード/バッジ（NEW・カテゴリ色・所要時間）、レスポンシブ、`:focus-visible` のアウトライン、ハンバーガーメニューの `aria-modal`/`aria-controls`、サイドレールの `aria-hidden` など、アクセシビリティ配慮あり。
- 高齢者配慮（大きめタップ領域・最小48px ボタン・明快な配色）。

### 課題と改善案

**[中] `/quiz` 一覧の説明文・タイトルがハードコードで全カード同一**
全カードが「マッチ棒1本だけを動かして…頭の体操にぴったりです！」固定（`src/routes/quiz/+page.svelte:72-74`）。タイトルも空時のフォールバックが特定問題文（`:65`）。実データ（カテゴリ名・`problemDescription` 抜粋）に置換すべき。重複コンテンツは UX・品質シグナル双方でマイナス。

**[低] 旧 UI 分析ドキュメントが現状と乖離**: `ui_ux_improvement_report.md` 等は紫系（#6c5ce7）旧デザイン前提で、現行の琥珀/イエロー基調と矛盾。新規貢献者を誤誘導するため整理推奨（§7）。

**[低] next-challenge 画像に `width/height` 無し**（§2と重複）→ レイアウト安定性。

---

## 6. 収益増の配信最適化

### 広告インベントリ（現状）

| ページ | 本文内 | インフィード | サイドレール |
|--------|--------|--------------|--------------|
| TOP / カテゴリ一覧 | 一覧上 1枠（slot `5756190566`） | 3枚毎に最大4枠（**SP限定**） | 160×600 ×2（`≥1540px` のみ） |
| 設問ページ | 3枠（`4170928887`/`3921249196`/`1724332823`） | — | ×2（同上） |
| 解答ページ | 4枠（上記+`5428887502`） | — | ×2（同上） |

### 良い点（維持）
- 遅延ロード（IntersectionObserver `rootMargin:400px`）、未配信折りたたみ、Consent Mode v2（日本向け既定 granted）。
- 設問→解答の動線上に過不足ない枠配置。

### 課題と改善案

**[中] デスクトップのインフィード広告がゼロ**
インフィード枠は `≥768px` で `display:none`（`ArticleFeed.svelte:70-74`）。PC/タブレットの一覧ページは「一覧上1枠＋サイドレール（しかも `≥1540px` のみ）」だけ。PC ユーザーの一覧面で機会損失。
**改善案**: PC でもグリッド内にレスポンシブのインフィード枠を挿入（幅・間隔はポリシー順守）。A/B で viewability/RPM を検証。

**[中] サイドレールが `≥1540px` 限定**（`+layout.svelte:137`）。1280〜1539px の標準的デスクトップで非表示。
**改善案**: レール幅を絞る等して表示しきい値を下げ、視認可能インプレッションを増やす（コンテンツ圧迫に注意）。

**[低] 同一 slot の使い回し**: `5756190566` がサイドレール用と一覧上枠で共用（`+layout.svelte:14` と `+page.svelte:40`）。プレースメント別レポートが取れない。枠ごとに固有 slot を推奨。
**[低] インフィード枠は4つ上限**（`src/lib/config/ads.js`）。13件目以降の一覧に追加枠なし。長い一覧が多いなら枠追加。

**[低・要確認] themoneytizer 連携の実態**
`ads.txt` は `MANAGERDOMAIN=themoneytizer.com` ＋ `themoneytizer.com,129141,DIRECT` で**有効登録**（`static/ads.txt:2-3`）。`app.html` の InMobi/Quantcast Choice CMP（`:27-186`）はその同意基盤。一方、ページ内の広告タグは AdSense（`ca-pub-2298313897414846`）のみで themoneytizer の配信タグは見当たらない。
→ **themoneytizer が実際に配信しているか要確認**。配信しているなら CMP は必須（削除不可）。していないなら、未活用の収益機会か、不要な CMP オーバーヘッドのいずれか。**安易な削除は ads.txt 違反・収益毀損リスクがあるため不可**。運用者に実態確認を依頼。

> 注（誤指摘の訂正）: 自動診断では「Consent Mode の順序が誤り」「display:none 広告がポーリングで浪費」「themoneytizer を削除」等の指摘が出たが、いずれも実コード確認の結果**不正確**。Consent default はタグ読込前に置くのが正（意図通り）、`display:none` 枠は IntersectionObserver が交差を返さず push 自体走らない、themoneytizer は ads.txt 上アクティブ。これらは対応不要。

---

## 7. 横展開・コード健全性（他サイトにも効く改善）

**[低] 旧ドキュメント／デバッグファイルの整理**
ルート直下の `analysis.md`・`todo.md`・`ui_ux_analysis.md`・`ui_ux_improvement_plan.md`・`ui_ux_improvement_report.md` は旧デザイン前提で陳腐化。`debug_sanity_data.mjs`・`sanity_debug.js`・`sanity_upload.mjs` も本番不要。`docs/` へ集約 or 削除し、リポジトリの可読性を回復。

**[低] 未使用コンポーネント `SideRailAd.svelte`**
import 箇所なし（実際のレールは `+layout.svelte` の `mountSideRailAd()` でインライン生成）。削除 or 正式採用で二重実装を解消。

**[低] カテゴリルートの重複**
`category/[slug]` がある一方、`kanji-quiz`・`nandoku-kanji`・`number-quiz`・`business-manner` が各約200行の専用ルートで重複。さらに Sanity 側で `kanji-quiz` と `nandoku-kanji` の2スラッグが同一カテゴリに混在（`category/kanji-quiz/+page.server.js:20-21,42-45`）。
**改善案**: 設定駆動の `[slug]` に集約してドリフト/バグを防止。並行して Sanity のスラッグを正規化（リダイレクト整備）。

**横展開しやすい標準化（推奨）**
- 共通 `<SanityImage>` コンポーネント化（§2の退行を構造的に防止）。
- SEO（title/JSON-LD）の単一ソース化（§1）。
これらは複数サイト運用時にもそのまま移植でき、品質のばらつきを抑えられる。

---

## 推奨アクションプラン

1. **今週（クイックウィン・低リスク）**: §1-1 タイトル二重付与、§1-2 JSON-LD 二重、§1-3 sitemap 是正、§2 解答ページ画像最適化、§5 `/quiz` 説明文の実データ化。
2. **次スプリント（要設計）**: §2 `popular` 削減、§6 PC インフィード/サイドレールしきい値、§4 固定枠の高さ予約、§1-2/§6 SearchAction 整合。
3. **バックログ（健全性）**: §7 ドキュメント整理・未使用コンポーネント削除・カテゴリルート統合・logo.png 圧縮・themoneytizer 実態確認。
4. **計測**: 修正前後で PSI（モバイル LCP/CLS/TBT）と AdSense のページ RPM・viewability を採取し、効果を定量検証。

> 本レポートは静的コード診断に基づく。実トラフィックの GA4／Search Console／AdSense 管理画面の指標と突き合わせると、優先度をさらに精緻化できる。
