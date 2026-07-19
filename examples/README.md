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
| [`async-export`](./async-export/) | Conditional list → async CSV/job → poll → download | time model, accept≠artifact, failure kinds; single-package feature slices | done |

## Reserved themes (not implemented)

Slugs and teaching axes are **reserved** so later work does not collide or dilute
the gap map. Implementation order is open; each still needs a charter before
scaffold (Exceeds prior on / Shows / Non-goals / stack / SoR).

Do **not** create `examples/<slug>/` for these until explicitly building that theme.
Do **not** fold these axes into existing examples as drive-by features.

| # | Slug (reserved) | Intent | Primary axes (exceed candidates) | Status |
| --- | --- | --- | --- | --- |
| 2 | `concurrent-edit` | Line-item edit with optimistic concurrency | version/ETag 409, conflict UX, no last-write-wins | reserved |
| 3 | `audit-trail` | Who/when/what/why on sensitive changes | append-only events, history as projection, read-only audit role | reserved |
| 4 | `draft-wizard` | Multi-step create with draft + staged validation | draft vs submit schemas, partial save, resume by id | reserved |
| 5 | `field-level-authz` | Same screen, different fields by role | field-level allow/mask, API drops fields (not UI-only hide), unmask audit | reserved |
| 6 | `saved-search` | Saved queries coexisting with SoR filter limits | persisted query, SoR constraint honesty, optional facets | reserved |

### Gap map (what these cover that done examples do not)

| Gap | Covered by |
| --- | --- |
| Time / long-running work | `async-export` (done) |
| Concurrent writes | `concurrent-edit` |
| Accountability / evidence | `audit-trail` |
| Input lifecycle / wizards | `draft-wizard` |
| Field-level authorization | `field-level-authz` |
| Saved search + SoR limits | `saved-search` (thin alone; may attach to another theme later) |

`saved-search` may stay a thin standalone or land as a sub-feature of another
example; the **slug and axis stay reserved** either way until decided at build time.
