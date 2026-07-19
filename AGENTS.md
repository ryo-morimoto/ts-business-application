# Agent guidance — ts-business-application

## Current state

- Root is **not** a monorepo template yet.
- There is no approved `packages/`, `apps/`, or workspace layout at root.
- Do **not** recreate root scaffold “to prepare for examples”.

## Rules

1. Work under `examples/<slug>/` only, unless the user explicitly asks to promote.
2. Each example is self-contained (own tooling, deps, apps as needed).
3. Examples must not depend on root packages (there are none by design).
4. Do not invent shared contracts/UI/domain kits at root before battle-testing.
5. Promotion to a root template requires explicit user decision after examples exist.

## Workflow

```text
examples (implement & compare) → promote (explicit) → root template
```

## Quality

- Existing examples are a **runnable floor**, not a **quality ceiling**.
- Do not clone another example’s layout as the default scaffold.
- New examples should state 1–3 axes where they intentionally exceed prior ones.

## B2B frontend knowledge

業務システム（管理画面・SaaS・社内ツール等）のフロント設計・実装では、視覚的な新規性より次を優先する。

- **業務の正確性** — ルール、状態遷移、権限を正しく反映する
- **操作効率** — 反復・検索・比較・一括・キーボード
- **予測可能性** — 操作結果、対象範囲、保存状態を明示する
- **回復可能性** — 入力エラー、通信障害、競合、部分失敗から復旧できる
- **監査可能性** — 誰が・いつ・何を変更したかを追跡できる
- **アクセシビリティ** — 主要業務をキーボードと支援技術で完了できる
- **保守性** — 型・テスト・設計ルールを再利用する

**正本:** [docs/b2b-frontend-guide.md](./docs/b2b-frontend-guide.md)

例の設計・レビュー・実装判断で、次に触れるときはガイドを読むこと。

| 論点 | ガイド節 |
| --- | --- |
| 状態遷移・不変条件・副作用 | §4 業務モデルと状態遷移 |
| 認可・テナント境界（UI非表示だけでは不可） | §5 認可とマルチテナント |
| 一覧・検索・ページ選択 vs 条件全件 | §6 一覧・検索・一括操作 |
| フォーム・競合・保存方式 | §7 フォームと編集 |
| 非同期ジョブ・部分失敗 | §8 非同期処理と部分失敗 |
| 空 / 検索0件 / 権限不足 / 障害の区別 | §9 画面状態とエラー |
| a11y・i18n・性能・テスト・監査 | §10–§15 |
| 設計・実装レビュー観点 | §16 |

ガイドは **shared package ではない**。コードとして import せず、設計判断とレビューの参照として使う。
