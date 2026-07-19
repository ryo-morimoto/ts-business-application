# draft-wizard

発注リクエストの **多段作成 + draft 途中保存 + staged validation**。

Next.js 16 の **RSC · Server Actions · Route Handlers** が、同一 deep module（`modules/drafting`）を呼ぶ。

## Quality charter

| Axis | Intentional exceed |
| --- | --- |
| Draft vs submit contract | draft 保存は緩いスキーマ、submit は完全スキーマ |
| Partial save / resume | id 付き draft · URL step で再開 |
| Staged validation | step 単位と submit 全体を分離（Gated Next） |
| Delivery seam | RSC / SA / RH → 同一 deep module（二重実装なし） |

**Exceeds prior on:** 入力ライフサイクル + 三者配信が同じ seam。

## Structure

```text
src/
├── app/                 # RSC pages · Server Actions · Route Handlers（薄い）
├── modules/drafting/    # deep module（public = index.ts のみ）
├── ui/wizard/           # client form island
└── shared/              # actor · result
```

**依存:** `app` / `ui` → `modules/drafting`（index）→ internal。`internal` を app/ui から import しない。

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 App Router |
| Mutations (UI) | Server Actions |
| HTTP contract / E2E | Route Handlers |
| Reads | RSC → module 直呼び（自己 fetch しない） |
| Form | @tanstack/react-form + Zod 4 |
| SoR | in-memory |

## Run

```bash
cd examples/draft-wizard
pnpm install
pnpm dev          # http://127.0.0.1:3014
pnpm test
pnpm typecheck
pnpm test:e2e
```

### Actor stub

Cookie `draft-wizard-actor` / header `x-actor-id`。

| Actor | Can |
| --- | --- |
| `author` | 自分の draft を作成・編集・提出 |
| `viewer` | 閲覧のみ |
| `admin` | 全 draft 編集可 |

## API (Route Handlers)

```text
GET    /api/health
GET    /api/drafts
POST   /api/drafts
GET    /api/drafts/:id
PATCH  /api/drafts/:id
POST   /api/drafts/:id/next
POST   /api/drafts/:id/submit
GET    /api/purchase-requests/:id
POST   /api/testing/reset
```

## Server Actions

```text
createDraftAction()
saveDraftAction(id, patch)
goNextAction(id, stepId, patch?)
submitDraftAction(id)
```

## Non-goals

- 承認ワークフロー（`approval-flow`）
- OCC（`concurrent-edit`）
- 非同期ジョブ（`async-export`）
- keystroke autosave / 本物 IdP / 外部 SoR
