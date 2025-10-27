# Sanity Studio クイズ一覧調査メモ

## 1. 最小構成での確認
- desk structure / preview / orderings を撤去した最小構成を作成。
- `pnpm --dir=studio sanity dev` を実行したが、Corepack がレジストリへ到達できず `Proxy response (403)` で失敗。
- ローカルでの一覧表示確認は未完了。ネットワークが通る環境で同コマンドを再実行して確認が必要。

## 2. ネットワークと権限の検証
- `pnpm --dir=studio sanity debug` も同じ 403 応答で失敗し、プロジェクトメタ情報の再確認はできていない。
- `defineConfig` に `useCdn: false` を追加し、CND 経由のキャッシュを避ける設定を適用。

## 3. 破損ドキュメントの検出
- Vision を起動できなかったため、クエリの実行は保留。
- 参考クエリ（Vision で順次実行）:
  ```
  *[_type=="quiz" && !defined(category->_id)]{_id, title}
  *[_type=="quiz" && (defined(slug) && slug.current != string(slug.current))]{_id, slug}
  *[_type=="quiz" && (defined(title) && title != string(title))]{_id, title}
  *[_type=="quiz" && defined(problemImage) && !defined(problemImage.asset._ref)]{_id}
  ```
- 0 件であることを確認し、異常があれば再選択・修正する。

## 4. 依存関係の整合性
- `pnpm dlx sanity@latest upgrade` や `pnpm --dir=studio install` 系コマンドはすべて Corepack の 403 エラーで失敗。
- ネットワークが通る環境で以下を実行して lockfile と `node_modules` を再構築することを推奨。
  ```bash
  pnpm dlx sanity@latest upgrade
  rm -rf studio/node_modules ~/.pnpm-store
  pnpm --dir=studio install --frozen-lockfile
  pnpm --dir=studio build
  ```

## 5. 機能の段階復旧
- orderings / preview / desk structure を一段ずつ復活させつつ安全性を高めた実装を作成。
- 実際の Studio での確認はネットワーク制約の解除後に実施する。

## 6. 最終ハードニング
- Preview で `title` / `subtitle` / `media` の戻り値を常に安全な値へ変換。
- orderings は存在が保証されたフィールド（`publishedAt`, `_updatedAt`）のみを参照。
- desk structure はクイズとカテゴリの標準リストのみを表示するシンプル構成に戻した。

## 残作業メモ
1. ネットワークが利用できる環境で `pnpm --dir=studio sanity dev` を再実行し、一覧が表示されることを確認。必要であれば DevTools Network で `data/query/*` の応答を確認。
2. Vision で上記クエリを実行し、破損ドキュメントが 0 件であることを記録。
3. `pnpm --dir=studio build` を実行してビルドが成功することを確認。
4. 本番 Studio でクイズ一覧が即時表示されているスクリーンショットを取得。
