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
