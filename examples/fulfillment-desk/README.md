# fulfillment-desk

Self-contained example: **fulfillment workbench** over an **external OMS as System of Record**, on **Next.js only**.

No separate Hono process. Route Handlers are a BFF over foreign in-process mocks (OMS / customer / inventory) with snake_case DTOs and foreign error envelopes.

## Quality charter

Existing examples are a **runnable floor**, not a quality ceiling.

| Axis | Intentional exceed |
| --- | --- |
| Composition observability | Response includes `provenance` (which SoRs, ops, durations, correlation id) |
| Partial composition failure | Missing customer → `composition_failed` (no invented names) |
| Error fidelity | `retry_after_sec` → `retryAfterSec` + `Retry-After` header; budget timeout is a real race |
| Port boundary | BFF depends on `ExternalPorts` (injectable), not concrete mocks |
| Filter honesty | Unknown query keys rejected; never silently dropped or client-faked |

**Exceeds prior on:** external SoR anti-corruption depth (provenance + composition failure + budget timeout), not UI chrome.

## Shows

- **BFF composition** — order detail merges OMS + customer + inventory (N+1 stays server-side); provenance table in UI
- **Structured external error mapping** — foreign envelope → app codes; UI never sees raw snake_case payloads
- **SoR filter constraints exposed** — only `status` + `warehouseId`; free-text returns `unsupported_filter`
- **Composition failure** — `ord_orphan` references missing customer; detail does not fabricate
- ship confirm against external inventory truth
- actor permission for ship (`viewer` denied)

## Non-goals

- separate API process / real third-party OMS
- optimistic locking / ETag
- bulk ship / partial line ship
- Vite web (this example is Next-only)
- real IdP / multi-tenant

## Stack

| Layer | Choice |
| --- | --- |
| UI + BFF | Next.js 15 App Router + Route Handlers |
| Contracts | `@fulfillment-desk/contracts` (Zod, camelCase + provenance) |
| Rules | `@fulfillment-desk/domain` (pure map / compose / filters / provenance collector) |
| Ports | `ExternalPorts` → foreign mocks under `server/external/` |

## Contrast with other examples

| Example | SoR | Stack |
| --- | --- | --- |
| `approval-flow` | in-process **app** store | Next-only |
| `bulk-reassign` | Hono API | Hono + Vite + Next |
| **`fulfillment-desk`** | **external** OMS/customer/inventory (foreign shape) | Next-only BFF |

## Run

```bash
cd examples/fulfillment-desk
pnpm install
pnpm dev          # http://127.0.0.1:3012
pnpm test
pnpm typecheck
pnpm test:e2e
```

### Actor stub

Client / tests send header `x-actor-id` (browser: select in UI).

| Actor | Can |
| --- | --- |
| `operator` | list, detail, ship |
| `admin` | same as operator |
| `viewer` | list, detail only |

### Simulate external failures

On ship, carrier codes:

| Carrier code | External behaviour |
| --- | --- |
| `YAMATO` / `SAGAWA` | normal ship (if stock ok) |
| `SIMULATE_RATE_LIMIT` | foreign `rate_limited` + `retry_after_sec: 30` |
| `SIMULATE_TIMEOUT` | latency exceeds call budget → foreign `timeout` |

Seeds:

- `ord_002` — inventory shortage (SKU-B needs 5, has 3)
- `ord_orphan` — OMS order with `cust_missing` (composition fails at customer)

## API (Route Handlers / BFF)

```text
GET  /api/health
GET  /api/orders?status=&warehouseId=   # + provenance
GET  /api/orders/:id                    # { order, provenance }
POST /api/orders/:id/ship               # { carrierCode } → { order, trackingNumber, provenance }
POST /api/testing/reset
```

Error body example (rate limit):

```json
{
  "error": "app_error",
  "code": "external_rate_limited",
  "message": "OMS rate limit exceeded",
  "retryAfterSec": 30,
  "correlationId": "corr_…",
  "failedSystem": "oms",
  "failedOperation": "ship_order",
  "externalCode": "rate_limited"
}
```

Headers: `Retry-After`, `x-correlation-id` when applicable.

## Layout

```text
packages/contracts   # app-facing Zod (+ provenance)
packages/domain      # pure: filters, error map, compose, provenance collector
apps/web
  src/server/external/   # foreign SoR mocks + ExternalPorts
  src/server/bff/        # createOrderBff(ports) orchestration
  src/app/api/           # Route Handlers
  src/components/
e2e/
```
