# PetCare

PetCareは、愛犬の日々の健康状態を記録し、変化を振り返りやすくするためのアプリです。

## Sprint 1の目的

犬の排便記録を登録し、新しい順に確認できる最小限の体験を作ります。対象要件と完了条件は [`docs/requirements.md`](docs/requirements.md) を正とします。

## 設計方針

- Astroをページとレイアウトの基盤に使う
- 操作を伴う画面要素はReactコンポーネントとして分離する
- スタイリングにはTailwind CSSを使う
- Sprint 1のデータはブラウザの`localStorage`だけに保存する
- 排便記録のドメイン型を`src/types/log.ts`に集約する
- 保存方式への依存を`src/utils/storage.ts`に閉じ込める
- フォーム、一覧、カードの責務を別々のコンポーネントに分ける

## ファイルの責務

```text
docs/requirements.md       Sprint 1の対象範囲と受け入れ条件
src/types/log.ts           排便記録のドメイン型
src/utils/storage.ts       保存処理の契約とストレージキー
src/components/LogForm.tsx 新規記録入力の境界
src/components/LogList.tsx 記録一覧表示の境界
src/components/LogCard.tsx 1件の記録表示の境界
```

`README.md`はセットアップと開発コマンド、`AGENTS.md`と`CLAUDE.md`は開発支援ツール向けの作業指示を扱います。この文書にはそれらを重複して記載しません。

## 今回の実装範囲

今回は設計とファイル構成のみを作成します。画面、フォーム操作、一覧描画、`localStorage`への読み書きは後続実装で追加します。
