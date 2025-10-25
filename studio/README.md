# Sanity Studio 運用メモ

- Sanity CLI v3.99 は CommonJS で CLI 設定をロードするため、`sanity.cli.js`／`sanity.config.js`／`schemas/*.js` は `require`/`module.exports` 構文で維持します。
- `sanity.cli.mjs` は生成しないでください（`studio/sanity.cli.mjs` は `.gitignore` 済み）。
- CLI コマンド（例: `pnpm sanity deploy`、`npx sanity deploy`）を実行するときに ESM 化すると `require is not defined` エラーになるので注意してください。

Sanity CLI を更新する際は、v4 へ強制的に上げないようにバージョンアップガイドを確認してください。
