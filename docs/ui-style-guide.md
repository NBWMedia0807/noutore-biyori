# UIスタイルガイド（脳トレ日和）

> 最終更新: 2025-XX-XX（このファイルは自動日付ではありません。必要に応じて更新してください）

## デザイントークン

| トークン | 役割 | 値 |
| --- | --- | --- |
| `--color-canvas` | サイト全体の背景色 | `#FFF9EF` |
| `--color-surface-elevated` | カード／ヘッダーなどの浮遊面 | `#FFFFFF` |
| `--color-border-subtle` | カード境界線・仕切り | `rgba(235, 173, 44, 0.28)` |
| `--color-primary-400` | ブランド基調色（リンク／アイコン） | `#F59E0B` |
| `--color-primary-500` | CTAの強調色 | `#F97316` |
| `--color-primary-600` | タイトル／重要テキスト | `#DB6B0F` |
| `--color-footer-bg` | フッター背景 | `#1F2933` |
| `--color-footer-text` | フッター文字色 | `#F8FAFC` |
| `--shadow-card-soft` | カードの標準シャドウ | `0 20px 45px rgba(249, 115, 22, 0.12)` |
| `--shadow-button` | ボタン初期シャドウ | `0 18px 34px rgba(234, 88, 12, 0.22)` |
| `--radius-xl` | カードの角丸基準 | `26px` |
| `--radius-pill` | 丸ボタン／チップ | `999px` |

### タイポグラフィ
- ベースフォント: `--font-body`
- 本文サイズ: `clamp(16px, 0.98rem + 0.15vw, 18px)`
- 行間: `1.72`
- 推奨行長: `~60〜68字`

## ボタン

`.button` を基底クラスとし、バリアントは修飾クラスで切り替えます。

| クラス | 用途 | 背景 / ボーダー | シャドウ | 備考 |
| --- | --- | --- | --- | --- |
| `.button` | ベース（淡いグラデーション） | `linear-gradient(135deg, var(--color-primary-200), var(--color-primary-400))` | `var(--shadow-button)` | 最低タップ領域: `min-height:48px` |
| `.button--primary` | 主要CTA（「正解ページへ」など） | `linear-gradient(135deg, var(--color-primary-200), var(--color-primary-500))` | `var(--shadow-button)` | テキスト色: `var(--color-primary-contrast)` |
| `.button--secondary` | 補助CTA（ヒント開閉） | `linear-gradient(135deg, rgba(255,242,204,0.96), rgba(255,215,142,0.96))` | `0 16px 30px rgba(253,186,116,0.26)` | 押下時は`aria-pressed=true`で状態を表現 |
| `.button--ghost` | 戻る導線など控えめなボタン | `var(--color-white)`／`1px`薄ボーダー | `0 12px 24px rgba(148,81,17,0.12)` | 背景が明るい領域で使用 |
| `.button--icon-leading` / `.button--icon-trailing` | アイコン付きCTA | 余白を調整 | 同上 | フォントサイズ `1.2rem`のアイコンを自動調整 |
| `.button--full` | モバイルでの全幅ボタン | 幅100% | 同上 | 640px以下で適用推奨 |

**状態遷移**
- `:hover`（pointer/hover環境のみ）: `translateY(-1.5px)`、わずかな明度アップ。
- `:active`: `translateY(1px) scale(0.99)`、シャドウ弱化。
- `:focus-visible`: `outline: 3px solid rgba(253, 186, 116, 0.75)`、`outline-offset: 3px`。
- `aria-pressed="true"` / `[data-pressed="true"]`: グラデーションを暖色寄りに切り替え、陰影を強めてオン状態を表現。
- `@media (prefers-reduced-motion: reduce)`: 位置変化・アニメーションは1msに短縮。

## カード（`.content-card`）

| 項目 | 値 |
| --- | --- |
| 角丸 | `var(--radius-xl)`
| 余白 | `padding: clamp(1.6rem, 3vw, 2.35rem)`
| 背景 | デフォルト: `linear-gradient(160deg, rgba(255,252,245,0.98), rgba(255,244,223,0.92))`（ページにより上書き可） |
| 境界線 | `1px solid var(--color-border-subtle)` |
| シャドウ | `var(--shadow-card-soft)` + `backdrop-filter: blur(6px)` |
| セクションヘッダー | `.section-header`（flex, gap `0.85rem`）、`.section-icon`（44×44px, 角丸18px） |
| 本文領域 | `.section-body`（`display:grid; gap:1.1rem; max-width:62ch`） |
| タイポ | 本文 `font-size: clamp(1.02rem, 1.8vw, 1.1rem)`、`line-height: 1.82` |

**アクセント変更**
- `.content-card > .section-header .section-icon` や `.content-card > .section-header h2` を局所的に上書きして、問題／解説など各ブロックの雰囲気を調整します。
- 箇条書き・引用はグローバルスタイルで `max-width`・`gap` が揃うため、追加指定は最小限でOKです。

## フッター（`.site-footer`）

| 項目 | 値 |
| --- | --- |
| 背景／文字色 | `var(--color-footer-bg)` ／ `var(--color-footer-text)` |
| 余白 | `padding: clamp(2.5rem, 4vw, 3.25rem) 1.5rem clamp(1.8rem, 3vw, 2.4rem)` |
| レイアウト | `.footer-inner`（中央寄せ, gap `1.5rem`） |
| リンク群 | `.footer-links`（モバイル: 2列グリッド、>=640px: フレックス + 区切り`・`） |
| リンク余白 | `min-height: 44px`, `padding: 0.45rem 0.9rem`, `border-radius: var(--radius-pill)` |
| ホバー／フォーカス | 背景 `rgba(248,250,252,0.12)`、文字色 `var(--color-footer-text)` |
| コピーライト | `.footer-copy`（`font-size: 0.95rem; color: rgba(248,250,252,0.78)`） |
| 年号 | `foundationYear`/`currentYear`計算で自動更新。2025年以降は `2025年〜202X年` 表記。 |

## モーションとアクセシビリティ
- グローバルで `prefers-reduced-motion: reduce` を尊重し、トランジション／アニメーション時間を1msへ短縮。
- すべてのインタラクティブ要素（リンク・ボタン）は `min-height: 44px` を満たすよう設計。
- フォーカスリングは `outline` ベースで統一し、背景色に関わらず視認できるコントラストを確保。
- リンクテキストは `text-decoration-thickness: 2px` + `text-underline-offset: 3px` とし、ホバーで色味のみ微調整。

## 実装メモ
- ヒント開閉ボタンは `aria-expanded` + `aria-pressed` を併用し、開閉状態をスクリーンリーダーへ伝達。
- カードの本文は 62ch の読みやすい行長を維持しつつ、`white-space: pre-line` が必要な箇所（解説のクロージングなど）では各コンポーネントで上書きしています。
- フッターナビの区切り記号 `・` は `li + li::before` で自動生成。モバイルではグリッド表示のため非表示。
