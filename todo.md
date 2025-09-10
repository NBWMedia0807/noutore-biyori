# Sanity連携問題の修正タスク

## 特定された問題点

### 1. 環境変数の不整合
- [x] .envファイルにVITE_プレフィックスの環境変数が不足
- [x] sanityPublic.jsでVITE_SANITY_PROJECT_IDを参照しているが未定義

### 2. メインページのデータ取得不備
- [x] src/routes/+page.svelteでdata.quizzesを使用しているが、対応する+page.server.jsが存在しない
- [x] クイズデータを取得するサーバーサイドコードが不足

### 3. Sanityクライアント設定の不整合
- [x] debug_sanity_data.mjsとsanity_debug.jsで異なるプロジェクトID（dxl04rd4）を使用
- [x] src/lib/sanity/client.jsでトークンが設定されていない
- [x] APIバージョンが古い（2021-10-21）

### 4. 空のファイル
- [x] src/lib/sanityClient.jsが空（削除済み）
- [x] src/lib/fetchQuizzes.jsが空（実装済み）

### 5. ルーティングの問題
- [x] ディレクトリ名`[slug] `（末尾にスペース）の修正
- [x] クイズページのクエリをスキーマに合わせて修正
- [x] メインページのリンクURLを正しいルートに修正

## 修正計画

### Phase 1: 環境変数の修正
- [x] .envファイルにVITE_プレフィックスの環境変数を追加
- [x] 既存の環境変数との整合性を確保

### Phase 2: メインページのサーバーサイド実装
- [x] src/routes/+page.server.jsを作成
- [x] クイズデータを取得するロジックを実装

### Phase 3: Sanityクライアント設定の統一
- [x] 全てのSanityクライアント設定で正しいプロジェクトIDを使用
- [x] APIバージョンを統一
- [x] 不要なデバッグファイルの修正

### Phase 4: 空ファイルの実装
- [x] 必要に応じてfetchQuizzes.jsを実装
- [x] sanityClient.jsの用途を確認して実装または削除

### Phase 5: テストと検証
- [x] 修正後のアプリケーションをテスト
- [x] Sanityからのデータ取得を確認
- [x] 画像表示の動作確認

## 修正完了！

✅ すべての問題が解決され、アプリケーションが正常に動作しています。

