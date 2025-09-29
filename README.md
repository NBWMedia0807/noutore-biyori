# noutore-biyori
脳トレ・クイズに特化したWebメディア「脳トレ日和」のフロントエンド（HTML/CSS）リポジトリです。

## セットアップ

### 環境変数ファイルの作成

```bash
cp .env.local.example .env.local

### Vercel 設定メモ

- Vercel のダッシュボード > Project Settings > Functions > Node.js Version を **22.x** に設定してください。
- 本リポジトリは Node.js 22 を前提にビルドされるため、プレビュー/本番とも同一設定で運用してください。
