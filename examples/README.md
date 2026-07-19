# examples

Self-contained applications. This is where implementation starts.

## Rules

- One directory per example: `examples/<slug>/`.
- Own `package.json` / lockfile / tooling as needed (nested project is fine).
- Do not assume a root workspace or root `packages/*`.
- Optional later: multiple webs (Vite / Next) inside one example, still
  self-contained.

## Quality: floor vs ceiling

Existing examples are a **runnable floor** (install, typecheck, tests, clear
README) — **not a quality ceiling**.

- Do **not** clone another example’s directory shape by default.
- Each new example should declare **1–3 axes** where it intentionally exceeds
  prior ones (see that example’s README charter).
- Prefer deeper theme-specific seams over matching monorepo cosmetics.

## Examples

| Slug | Intent | Exceeds prior on (summary) | Status |
| --- | --- | --- | --- |
| [`bulk-reassign`](./bulk-reassign/) | List → bulk assignee change; page vs all; mixed authz; partial success | multi-web vs same API semantics | Phase 4 done |
| [`approval-flow`](./approval-flow/) | State machine approve/reject; Next full-stack (no separate Hono) | pure domain transitions in-process | Phase 5 done |
| [`fulfillment-desk`](./fulfillment-desk/) | External OMS as SoR; Next-only BFF | provenance, composition failure, budget timeout, port DI | done |
