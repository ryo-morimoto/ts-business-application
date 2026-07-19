# bulk-reassign

Self-contained example: customer list → bulk assignee change.

## Shows

- page selection vs all matching
- mixed permissions inside one bulk request (no silent skip)
- partial success + failed reasons
- idempotent bulk submit (`requestId`)

## Non-goals

- visual polish, full i18n
- real IdP / multi-tenant SaaS
- Next full-stack (Server Actions as API) — web-next talks to this Hono API only

## Stack matrix

| Target | Package | Stack | API |
| --- | --- | --- | --- |
| api | `@bulk-reassign/api` | Hono | — |
| web | `@bulk-reassign/web` | Vite + React (Phase 2) | this api |
| web-next | `@bulk-reassign/web-next` | Next App Router (Phase 3) | this api |

**Same across webs:** contracts, authz rules, partial / idempotency semantics.  
**Differs:** routing, URL state, entry, deploy shape.

## Layout

```text
packages/contracts   # Zod schemas for this example
packages/domain      # pure resolve / authorize / apply
apps/api             # Hono + in-memory fixtures
apps/web             # Vite (Phase 2)
apps/web-next        # Next (Phase 3)
```

Does **not** import from repo root.

## Run

```bash
cd examples/bulk-reassign
pnpm install
pnpm dev          # API + Vite web
pnpm dev:next     # API + Next web
pnpm dev:api      # API only
pnpm test
pnpm test:e2e          # Playwright: vite + next projects
pnpm test:e2e:vite
pnpm test:e2e:next
pnpm typecheck
```

E2E prefers system `chromium` when on PATH (NixOS-friendly).  
Optional downloaded browsers:

```bash
pnpm playwright:install   # → ./.playwright-browsers
```

- API: `http://127.0.0.1:8788`
- Vite web: `http://127.0.0.1:5173`
- Next web: `http://127.0.0.1:3010`

### Vite vs Next (same API)

| Concern | `apps/web` | `apps/web-next` |
| --- | --- | --- |
| Entry | Vite SPA `main.tsx` | App Router `app/page.tsx` |
| URL state | `history.replaceState` | `useSearchParams` + `router.replace` |
| Env | `VITE_API_BASE_URL` | `NEXT_PUBLIC_API_BASE_URL` |
| Authz / bulk | Hono only | Hono only (N1 — no Server Actions API) |

### Actor stub

Send header `x-actor-id`:

| Actor | Notes |
| --- | --- |
| `admin` | can assign all customers |
| `agent-a` | cannot assign customer `c-003` |
| `agent-b` | cannot assign `c-002`, `c-005` |

## Phase status

| Phase | Status |
| --- | --- |
| 1 api + packages + tests | done |
| 2 web (Vite) | done |
| 3 web-next | done |
| 4 e2e | done |
