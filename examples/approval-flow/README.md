# approval-flow

Self-contained example: request approval state machine on **Next.js only** (plan B).

No separate Hono process. Route Handlers call pure domain rules in-process.

## Shows

- `draft → submitted → approved | rejected` (+ `rejected → submitted` resubmit)
- server validates **current state × action × actor permission** (not UI order)
- reject requires **reason**
- denied transitions return structured errors (no silent ignore)

## Non-goals

- separate API server
- real IdP / multi-tenant
- concurrent edit / full audit UI
- Vite web (this example is Next-only)

## Stack

| Layer | Choice |
| --- | --- |
| UI + HTTP | Next.js 15 App Router + Route Handlers |
| Contracts | `@approval-flow/contracts` (Zod) |
| Rules | `@approval-flow/domain` (pure) |
| Store | in-memory module (process-local) |

## Run

```bash
cd examples/approval-flow
pnpm install
pnpm dev          # http://127.0.0.1:3011
pnpm test
pnpm typecheck
```

### Actor stub

Client / tests send header `x-actor-id` (browser: select in UI).

| Actor | Can |
| --- | --- |
| `author` | create, submit, resubmit (own drafts / rejected) |
| `reviewer` | approve, reject on submitted |
| `admin` | all transitions |

## API (Route Handlers)

```text
GET  /api/health
GET  /api/requests
GET  /api/requests/:id
POST /api/requests
POST /api/requests/:id/transitions
POST /api/__test__/reset
```

## Layout

```text
packages/contracts
packages/domain
apps/web          # Next (UI + Route Handlers + store)
e2e/              # optional smoke
```
