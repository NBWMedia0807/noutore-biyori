# SmartNews向けRSS：重複スラッグの調査・修正手順（タスクB）

SmartNews からの指摘②「item.link の URL と記事内容が異なる／遷移先がエラー」の
**根本原因＝重複スラッグ** を、Sanity 上で調査・修正するための手順書です。

> コード側の対策（canonical URL 化・重複除外・slug の isUnique 検証）は実装済みですが、
> **すでに Sanity に存在している重複スラッグのデータ自体** はコードでは直せないため、
> 本手順で手動修正が必要です。

---

## 背景（なぜ起きるか）

- クイズ記事ページは `slug.current == $slug` の先頭1件（`[0]`）で解決される。
- そのため **複数のクイズが同じ `slug.current` を持つ**と、リンク先が「別の記事」に解決され、
  フィードのタイトルと中身が食い違う（最悪、遷移先がエラー＝404）。
- 特に **再公開記事（`isRepublished == true`）が元記事と同じスラッグを再利用している**ケースが疑わしい。

---

## 手順1：重複スラッグを洗い出す

Sanity Studio の **Vision（GROQ プレイグラウンド）** で以下を実行します。

```groq
*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  defined(slug.current)
]{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  isRepublished,
  "duplicateCount": count(*[
    _type == "quiz" &&
    !(_id in path("drafts.**")) &&
    slug.current == ^.slug.current
  ])
}[duplicateCount > 1] | order(slug asc, publishedAt desc)
```

- 同じ `slug` を持つ記事が **slug 順に並んで** 表示されます（**0件なら重複なし**）。
- `isRepublished` 列を見て、再公開記事が重複元になっていないか確認します。

---

## 手順2：指摘された記事を直接確認（任意）

SmartNews が具体例として挙げた記事を確認する場合：

```groq
*[_type == "quiz" && (
  title match "*答えは*" ||
  title match "*30を作ろう*" ||
  title match "*博識*" ||
  title match "*アナグラム*"
)]{ _id, title, "slug": slug.current, isRepublished, publishedAt } | order(slug asc)
```

> スラッグの形式が分かっている場合は、`slug.current in ["...", "..."]` で直接引くのが確実です。
> 例：`*[_type == "quiz" && slug.current in ["arithmetic-quiz/182","formula-puzzle/27","kanji-quiz/246"]]{ _id, title, "slug": slug.current }`

---

## 手順3：修正する

手順1で見つかった **各重複グループ（同じ slug・複数記事）** について、次を行います。

1. **「正」とする記事を1つ決める**（通常はスラッグの内容と一致する元記事）。
2. もう一方（多くは `isRepublished == true` の再公開記事）の **slug を一意な値に変更して再公開**する。
   - 例：内容に合った新しいスラッグにする／末尾に識別子・連番を付ける。
3. その重複記事が不要なら、**非公開化または削除**も検討する。

> 本コードをデプロイ後は Studio 側に slug の重複チェック（`isUnique`）が効くため、
> スラッグ変更時に重複があれば警告が出ます。

---

## 手順4：確認する

1. **手順1のクエリを再実行** → 結果が **0件** になれば重複は解消。
2. 本番反映後、**SmartFormat チェックツール**で再検証：
   https://sf-validator.smartnews.com/

---

## 補足：再発防止

恒久対処として、以下を多層で備えています。

1. **Studio 側のブロック**：quiz スキーマの `slug` に `isUnique` 検証を追加済み。
   Studio 上での重複公開はブロックされます。
2. **フィード側の安全網**：RSS は「同一スラッグは最新1件のみ」に絞るため、
   フィード内に同じ item.link が二重に出ることはありません。
3. **自動監視チェック**：`scripts/check-duplicate-slugs.mjs`（後述）。
   作成経路（Studio / API / スクリプト）を問わず、重複を検出します。

> ⚠️ `isUnique` 検証は **Studio の画面操作にしか効きません**。
> **API 経由のアップロード（`pipeline.py` / `sanity_upload.mjs` 等）は検証を通らない**ため、
> 下記の監視チェックで検知する運用とします。

### 自動監視チェック

```bash
pnpm check:slugs
```

- **空スラッグ** / **別内容が同一スラッグを共有（Type B）** → ❌ エラー（`exit 1`）
- **同一タイトルの重複コピー（Type A）** → ⚠️ 警告のみ（同一内容なので非致命的）
- 読み取りトークン未設定・ネットワーク失敗時は **スキップ（`exit 0`）**

このチェックは `scripts/preflight.mjs` からも実行されるため、
preflight を通すビルド/デプロイ経路では、致命的な重複があると自動で止まります。
