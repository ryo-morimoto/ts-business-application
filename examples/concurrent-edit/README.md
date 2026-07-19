# concurrent-edit

明細付き受注を **楽観的同時実行制御（OCC）** で編集する example。  
スタックは既存例と意図的に違い、**TanStack Start family** で組む。

## Quality charter

| Axis | Intentional exceed |
| --- | --- |
| Optimistic concurrency | `expectedVersion` 必須。不一致は **version_conflict**（last-write-wins 禁止） |
| Conflict UX | 自分の draft vs server current を対比。reload / rebase を明示 |
| TanStack cohesive stack | Start + Router + Query + Form + Table(list) |
| Structure | 単一 package + `features/orders` 縦割り + 公式 `*.functions.ts` / `*.server.ts` |

**Exceeds prior on:** concurrent write 契約と conflict UX、および Next/Hono 以外の TanStack Start 見本。

## Shows

- 受注一覧（TanStack Table）→ 明細編集（TanStack Form array）
- loader は `queryClient.ensureQueryData` のみ；UI は `useSuspenseQuery`（TkDodo 流）
- 保存は `createServerFn` + pure `applyOrderUpdate`
- peer が先に保存したあとの stale save → conflict panel
- viewer は read-only

## Non-goals

- HTTP ETag / If-Match ヘッダ（body の `version` で教える）
- mutation の楽観的 cache 更新（OCC と混同しやすい）
- CRDT / WebSocket 協調編集
- 別プロセス Hono / Next App Router
- 実 DB / 実 IdP

## Stack

| Layer | Choice |
| --- | --- |
| App | TanStack Start (Vite) |
| Router | `@tanstack/react-router` file routes |
| Server state | TanStack Query + `react-router-ssr-query` |
| RPC | `createServerFn` |
| Form | `@tanstack/react-form` + Zod Standard Schema |
| List | `@tanstack/react-table` |
| SoR | process-local memory (`.server.ts`) |

## Layout

```text
src/
  routes/                 # URL + loader 配線のみ
  features/orders/
    model/                # schemas + pure apply + tests
    api/                  # *.server / *.functions / queries / mutations
    ui/                   # list / form / conflict
  shared/actor|errors
  components/             # shell boundaries
  router.tsx
```

## Run

```bash
cd examples/concurrent-edit
pnpm install
pnpm dev          # http://127.0.0.1:3014
pnpm test
pnpm typecheck
pnpm test:e2e
```

### Actor stub

Cookie `concurrent-edit-actor`（UI セレクト）と header `x-actor-id`。

| Actor | Role |
| --- | --- |
| `alice` | editor |
| `bob` | editor |
| `viewer` | read-only |

### Demo conflict

1. Open `ord_1001` as Alice  
2. Edit customer  
3. **Simulate peer save**（server version だけ進む）  
4. **Save** → conflict panel（draft は残る）  
5. **Keep mine · rebase** または **Discard mine · load server**

## Patterns copied (sources)

- Official `start-basic-react-query`: `getRouter` + SSR Query integration + `queryOptions`
- Start server functions docs: `.functions.ts` / `.server.ts` split
- TkDodo Query Options API + Router/Query: loader primes cache; component observes
- TkDodo RQ + Forms: form mounts with server snapshot; draft is client state
- TanStack Form: field array + form-level Zod validator + `form.Subscribe`
