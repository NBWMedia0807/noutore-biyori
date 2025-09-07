# Vercel Production Deployment Setup

このドキュメントは、Vercel Production環境を最新のmainブランチコミットに自動同期させるための設定手順です。

## 概要

このプロジェクトは以下の設定により、mainブランチへのコミット時に自動的にVercel Productionにデプロイされます：

1. **vercel.json** - Vercel固有の設定
2. **svelte.config.js** - SvelteKit Vercelアダプターの使用
3. **GitHub Actions Workflow** - mainブランチ変更時の自動デプロイ

## 必要な環境変数

Vercelプロジェクトで以下の環境変数を設定してください：

### Sanity CMS
- `SANITY_PROJECT_ID`: quljge22 (固定値)
- `SANITY_DATASET`: production (固定値)
- `SANITY_API_TOKEN`: SanityのAPIトークン
- `SANITY_READ_TOKEN`: Sanityの読み取り専用トークン

### GitHub Actions (オプション)
GitHub Secretsに以下を設定することで、GitHub Actions経由でのデプロイも可能：
- `VERCEL_TOKEN`: VercelのAPIトークン
- `VERCEL_ORG_ID`: VercelのOrganization ID
- `VERCEL_PROJECT_ID`: VercelのProject ID

## デプロイメントフロー

1. **自動デプロイ**: mainブランチへのpush時にVercelが自動デプロイ
2. **手動デプロイ**: GitHub ActionsのWorkflowを手動実行
3. **ビルドエラー対応**: Sanity環境変数が正しく設定されていることを確認

## ロールバック手順

問題が発生した場合：

1. **Vercelダッシュボード**から以前の安定版デプロイメントにロールバック
2. **緊急時**: このPRの変更を元に戻し、新しいコミットでmainにpush
3. **設定削除**: `vercel.json`または`.github/workflows/vercel-production.yml`を削除

## 確認項目

- [ ] Vercel環境変数が正しく設定されている
- [ ] mainブランチでのビルドが成功する
- [ ] Production URLでアプリケーションが正常に動作する
- [ ] Preview環境との機能差異がない

## トラブルシューティング

- **ビルドエラー**: Sanity環境変数の確認
- **デプロイ失敗**: Vercelプロジェクト設定の確認
- **機能差異**: mainブランチのコードと実際のデプロイの同期確認