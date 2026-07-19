# ts-business-application

TypeScript **business-system** examples first; a cloneable **template** only after
patterns are battle-tested.

## Current state

Root has **no** fixed monorepo / `apps` / `packages` layout yet.

Those shapes are easy to invent and hard to unlearn. They will appear only when
something has survived real use under `examples/`.

```text
ts-business-application/
  examples/          # work happens here
  docs/              # design knowledge (not importable packages)
  README.md
  AGENTS.md
```

## Knowledge

- [B2Bフロントエンド設計・実装ガイド](./docs/b2b-frontend-guide.md) — 業務フロントの品質優先順位・状態遷移・認可・一覧/一括・フォーム・部分失敗・a11y 等。Agents は [AGENTS.md](./AGENTS.md) から参照する。


## Rules

1. Implement under `examples/<slug>/` as self-contained projects.
2. Do not add root libraries “for examples to import”.
3. After several examples, promote **stable** layout and code into a root
   template structure (then document how to clone it).

```text
examples/*  ──(promote when stable)──►  root template (not yet)
```

## Examples

See [examples/README.md](./examples/README.md).

## Next

Build `examples/bulk-reassign` (and others) without assuming a shared root kit.
