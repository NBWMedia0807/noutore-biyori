# コントリビューションガイド

## Node.js / pnpm のバージョン
- Node.js は `20.x` を使用してください。`.nvmrc` を配置しているので、`nvm use` で同じバージョンを利用できます。
- パッケージマネージャは Corepack 経由で有効化した `pnpm@10.15.0` に統一しています。

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
```

## 依存関係の追加・更新
- 依存関係を追加・更新する際は `pnpm install` で生成された `pnpm-lock.yaml` を必ず同じコミットに含めてください。
- `pnpm install --frozen-lockfile` が失敗する状態のまま PR を作成しないでください。
- 変更後は `pnpm run ci:verify` を実行し、ロックファイルの整合性とコンフリクトマーカーの混入がないことを確認してください。

## コンフリクトマーカーの禁止
- `&lt;&lt;&lt;&lt;&lt;&lt;&lt;` / `&#61;&#61;&#61;&#61;&#61;&#61;&#61;` / `&gt;&gt;&gt;&gt;&gt;&gt;&gt;` を含むファイルは CI と Husky の pre-commit フックで拒否されます。必ず手動で解消してください。
- コンフリクト解消時は `main` ブランチの内容を優先しつつ、`effectivePublishedAt` をはじめとする最新仕様を維持してください。

## CI / Vercel への反映
- GitHub Actions (`CI - Lock & Conflict Check`) と Vercel の Install Command は共通で `corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile` を実行します。
- 本番ビルドは Node.js 20.x を前提にしているため、Vercel の Project Settings でも Node.js 20.x を指定してください。

## テスト
- 変更を加えた際は `pnpm test` と `pnpm run build` の実行を推奨します。
- Playwright CLI を利用する場合は `pnpm add -D @playwright/test` を実行してから `ENABLE_QUIZ_STUB=1 SKIP_SANITY=1 pnpm playwright test` を実行してください。依存を追加せずに `node scripts/run-playwright-tests.mjs` を実行すると、フォールバックロジックが自動でスナップショット検証を行います。
