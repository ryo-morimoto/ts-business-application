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
| [`concurrent-edit`](./concurrent-edit/) | Line-item edit with optimistic concurrency | version OCC, conflict UX, TanStack Start family | done |
| [`draft-wizard`](./draft-wizard/) | Multi-step create with draft + staged validation | draft/submit schemas, Gated Next, RSC+SA+RH → one deep module | done |
| [`kobutsu-satei`](./kobutsu-satei/) | CMS 多層ルールで古物査定フォームを動的構築 | multi-layer evaluate, same evaluator dual surface, create pin + repin | done |
| [`account-desk`](./account-desk/) | 取引先 list/detail/edit の高密度デスク UI + 自前 design system | 3-surface IA, dense aggregate, anti-slop tokens | done |

## Design archive: `draft-wizard` (implemented)

Charter and structure live in [`draft-wizard/README.md`](./draft-wizard/). The notes below are the design record that drove implementation.

### `draft-wizard` — 発注リクエストの多段作成

| | |
| --- | --- |
| Intent | Multi-step create with draft + staged validation |
| Domain | 発注リクエスト（基本情報 → 明細 → 確認 → submit） |
| Stack | **Next.js 16** App Router: **RSC + Server Actions + Route Handlers**（separate API process なし） |
| SoR | 自前 in-memory（外部 SoR は `fulfillment-desk` の担当） |

**Exceeds prior on**

| Axis | Intentional exceed |
| --- | --- |
| Draft vs submit contract | draft 保存は緩いスキーマ、submit は完全スキーマ。同一型の optional 化でごまかし禁止 |
| Partial save / resume | step 途中でも id 付き draft として永続化し、URL/id で再開 |
| Staged validation | step 単位の検証と submit 時の全体検証を分離。UI と server が同じ段階を共有 |
| Delivery seam | RSC 読取 · SA mutation · RH 契約が **同一 deep module**（ロジック二重実装なし） |

**Non-goals**

- 承認ワークフロー（`approval-flow`）
- OCC / 同時編集 UX（`concurrent-edit`）
- 非同期ジョブ出力（`async-export`）
- 本物の IdP / 多テナント / 外部 SoR
- keystroke autosave / resume token メール / wizard versioning
- `saved-search` の同居

#### Outcome (provisional)

```text
author が未完成の発注リクエストを step 単位で保存・再開し、
submit 時のみ完全契約を通して確定レコードにする。
（approval-flow の draft ステータスとは別物）
```

#### Knowledge labels

| Kind | Item |
| --- | --- |
| **fact** | 既存: `approval-flow` は contracts+domain+Route Handlers; `async-export` は feature-slice+Server Actions; `concurrent-edit` は TanStack Form+Zod |
| **fact** | charter: Next-only, 発注リクエスト, in-memory SoR |
| **decision** | **単一 package + `src/`**（`packages/` / `apps/` なし）。超過軸はスキーマ段階; monorepo 分割はしない |
| **decision** | サーバ draft が SoR。クライアント form は working copy（Zustand 等のクライアント永続 store は使わない） |
| **decision** | Draft と Submitted は**型を分ける**（同一型の optional 化禁止）。store は別 Map でも status 分岐でもよいが、型境界は必須 |
| **decision** | step id は安定文字列: `basics` → `lines` → `review`（数値 index を契約にしない） |
| **decision** | 保存トリガ: **Save 明示 + Next 時**（keystroke autosave は non-goal） |
| **decision** | Next 配信面は **RSC + Server Actions + Route Handlers の三者**（下記 Delivery）。業務ロジックは deep module 1 箇所に集約し、三者は薄い adapter |
| **decision** | Runtime stack: **Next 16 + React 19.2 + Zod 4 + TS latest**（下記 Stack pin）。既存 example の Next 15 ピンは floor |
| **decision** | Form: `@tanstack/react-form` + Zod 4 Standard Schema（`concurrent-edit` と整合）。mutation は **Server Actions** 経由（client から直接 fetch しないのが主経路） |
| **decision** | submit 再送: `already_submitted`（冪等に近い挙動）。OCC はしない（last-write-wins on PATCH） |
| **assumption** | actor は `x-actor-id` stub（author / viewer）。owner 以外は draft 編集不可 |
| **assumption** | 明細は 0 行の draft 可; submit 時は 1 行以上 |
| **decision** | Step navigation: **Gated Next**（未来 step へは step schema 通過後のみ; 過去 step は戻れる） |

#### Delivery: RSC + Server Actions + Route Handlers

三者は **同じ deep module**（draft lifecycle）を呼ぶ。ロジックの二重実装は禁止。

| 面 | 役割 | 呼ぶもの | 呼ばない |
| --- | --- | --- | --- |
| **RSC**（`page.tsx` 等） | **読取・合成**。一覧 / draft 再開 hydrate 用 props / submitted 詳細 / readiness 表示のサーバ側投影 | deep module の query（`get` / `list`） | patch/submit のルール本体を page に書かない |
| **Server Actions**（`'use server'`） | **UI 起点の mutation**。create / save / goNext / submit。認可は Action 内でも再確認 | deep module の command。成功後 `revalidatePath` / `redirect`（submit 後） | raw SQL もどきや schema 直書きの散在 |
| **Route Handlers** | **HTTP 契約の正本 + E2E/外部クライアント**。SA と同意味の create/save/submit/get。`testing/reset` | 同じ deep module | UI 専用の redirect に依存しない（JSON 契約） |

```text
                    ┌─────────────┐
  RSC (read) ──────►│             │
  Server Action ───►│ draft module│──► in-memory store
  Route Handler ───►│  (deep)     │
                    └─────────────┘
```

**セマンティクス対応（SA と RH は同契約）**

| 操作 | Server Action（UI 主） | Route Handler（契約/E2E） |
| --- | --- | --- |
| create | `createDraftAction()` → redirect `/drafts/:id` | `POST /api/drafts` → 201 + body |
| save | `saveDraftAction(id, patch)` | `PATCH /api/drafts/:id` |
| next | `goNextAction(id, stepId, patch?)` | `POST /api/drafts/:id/next`（または PATCH + step フィールド） |
| submit | `submitDraftAction(id)` → redirect PR | `POST /api/drafts/:id/submit` |
| get/list | RSC が module を直接読取（fetch 自己 HTTP しない） | `GET /api/drafts`, `GET /api/drafts/:id` |

公式: mutations は Server Functions / Actions（[Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data)）。Action は POST で到達可能なので **毎回 actor 認可**（公式 Data Security と同趣旨）。

**RSC の具体**

- `app/page.tsx` — 一覧（RSC）+ New（form action → create Action）
- `app/drafts/[id]/page.tsx` — `await params/searchParams` で draft を module から読取 → **Client wizard に initial view を props**
- `app/purchase-requests/[id]/page.tsx` — submitted の read-only（RSC）
- loading/error は任意（初回は page で十分なら省略可）

**Client island**

- Wizard form（TanStack Form）のみ `'use client'`
- Save/Next/Submit は import した Server Actions を呼ぶ（主経路）。E2E は RH を叩いてもよい（async-export 同型の二重入口）

#### Directory structure (polished)

単一 package。**軸は deep module の public interface**。フォルダはそれを守る packaging。

```text
examples/draft-wizard/                    # 唯一の package（packages/ · apps/ なし）
├── e2e/
│   └── draft-wizard.spec.ts
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── src/
    ├── app/                              # 【Delivery】Next ランタイムのみ（薄い）
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx                      # RSC: list + create form(action)
    │   ├── drafts/
    │   │   └── [id]/
    │   │       └── page.tsx              # RSC: get → <Wizard initial />
    │   ├── purchase-requests/
    │   │   └── [id]/
    │   │       └── page.tsx              # RSC: submitted detail
    │   ├── actions/
    │   │   └── drafts.ts                 # 'use server' → modules/drafting のみ
    │   └── api/
    │       ├── health/route.ts
    │       ├── drafts/
    │       │   ├── route.ts              # GET list · POST create
    │       │   └── [id]/
    │       │       ├── route.ts          # GET · PATCH(save)
    │       │       ├── next/route.ts     # POST goNext
    │       │       └── submit/route.ts   # POST submit
    │       ├── purchase-requests/
    │       │   └── [id]/route.ts
    │       └── testing/
    │           └── reset/route.ts
    │
    ├── modules/
    │   └── drafting/                     # 【Deep module】業務の唯一の seam
    │       ├── index.ts                  # 公開 API + 公開 View 型のみ
    │       └── internal/                 # 非公開（app/ui から import 禁止）
    │           ├── schemas.ts            # patch / step* / submit
    │           ├── steps.ts              # step id · 順序 · gate
    │           ├── merge.ts              # partial patch merge
    │           ├── authorize.ts          # owner / role
    │           ├── store.ts              # in-memory SoR
    │           ├── commands.ts           # save / goNext / submit 実装
    │           └── queries.ts            # get / list
    │
    ├── ui/
    │   └── wizard/                       # 【Client island】表示と form のみ
    │       ├── wizard.tsx                # 'use client' · TanStack Form
    │       ├── step-basics.tsx
    │       ├── step-lines.tsx
    │       ├── step-review.tsx
    │       └── field-errors.tsx
    │
    └── shared/
        ├── actor/                        # cookie · header · Actor 型
        │   ├── index.ts
        │   ├── actor.ts
        │   ├── cookie.ts
        │   └── resolve.ts                # RSC/SA/RH 共通の actor 解決
        └── http/
            └── result.ts                 # JSON/Action 共通の { ok, code, ... } 形
```

##### 層の意味（3つだけ）

| 層 | 役割 | 深さ |
| --- | --- | --- |
| `modules/drafting` | 段階スキーマ · lifecycle · SoR · 認可 | **深い** public: 少数の関数 |
| `app/*` | RSC / SA / RH の配線と HTTP・redirect | **浅い** adapter |
| `ui/wizard` | form · step UI · Action 呼び出し | **浅い** presentation |

`features/` · `entities/` · `widgets/` · FSD 層は **置かない**（async-export の軸をコピーしない）。

##### 依存方向（import 規則）

```text
app/page · app/actions · app/api
        │
        ▼
  modules/drafting  (index.ts のみ)
        │
        ▼
  modules/drafting/internal/*   ← app/ui から禁止
        │
        └── shared/*            ← どこからでも可（業務ルールは持たない）

ui/wizard
  → app/actions/drafts   (Server Actions)
  → modules/drafting     (型 · 公開 View のみ。store/commands は不可)
  → shared
```

| 禁止 | 理由 |
| --- | --- |
| `app/**` → `modules/drafting/internal/**` | adapter が実装詳細に結合する |
| `ui/**` → `internal/**` または `store` | client bundle / server 境界破壊 |
| `modules/drafting` → `app/**` または `ui/**` | deep module が framework に汚染される |
| page が `fetch('/api/...')` | RSC は module を直接呼ぶ |
| SA と RH で別 validation 実装 | 契約分裂 |

##### `modules/drafting` の public interface（index.ts）

```ts
// 公開はこの面だけ。内部ファイルは re-export しない。
create(actor): DraftView
get(actor, id): DraftView | SubmittedView | Err
list(actor): DraftView[]
save(actor, id, patch): DraftView | Err
goNext(actor, id, stepId, patch?): { draft: DraftView; step: StepId } | Err
submit(actor, id): SubmittedView | Err

// 公開型: DraftView, SubmittedView, StepId, DraftPatch, Err codes
// 非公開: Zod raw schemas の一部は UI 用に step schema だけ export してもよい
//         （export するなら index 経由の意図的な public。internal 直 import は禁止）
```

テスト: **unit は `modules/drafting` の public を叩く**（interface = test surface）。  
internal の単体テストは任意・少数（schema 境界など）。

##### 各 adapter の中身（1 ファイルの厚さ）

| ファイル | やってよいこと | やってはいけないこと |
| --- | --- | --- |
| `app/**/page.tsx` | actor 解決 · `get`/`list` · props · `<Wizard />` | merge · step gate · store 直書き |
| `app/actions/drafts.ts` | actor 解決 · `create/save/goNext/submit` · `revalidatePath`/`redirect` | schema 定義の複製 |
| `app/api/**/route.ts` | parse body · actor · module 呼出 · `Response.json` + status | UI redirect · form 知識 |
| `ui/wizard/*` | form state · client 側 step ヒント · Action 呼出 · エラー表示 | SoR · submit 完全検証の独自実装（最終は server） |

##### パス alias（予定）

```json
// tsconfig paths
"@/*": ["./src/*"]
```

例: `import { create, get } from "@/modules/drafting"`  
`import { saveDraftAction } from "@/app/actions/drafts"`

##### 意図的に捨てた配置

| 捨てた案 | 理由 |
| --- | --- |
| `packages/contracts` + `domain` | monorepo 分割は exceed 軸ではない |
| `features/*` 縦割り（async-export 型） | use-case を folder に晒すと interface が浅くなる |
| route 配下 `_lib` に schema 同居 | 契約が URL に散る |
| `'use server'` を `modules/drafting` 内に置く | deep module が Next に結合する |
| FSD `views/widgets/entities` | example 規模に対して層が多すぎる |

#### Stack pins（npm latest 調査日: 2026-07-20）

| Package | Pin | 備考 |
| --- | --- | --- |
| `next` | `^16.2.10` | docs 表示 Latest = 16.2.10; engines `node >= 20.9` |
| `react` / `react-dom` | `^19.2.7` | App Router は React 19.2 系 |
| `@types/react` / `@types/react-dom` | `^19.2.x` | react と揃える |
| `zod` | `^4.4.3` | Zod 4 stable（repo 内 async-export も v4） |
| `@tanstack/react-form` | `^1.33.2` | peer: React 17–19 |
| `typescript` | `^7.0.2` | npm latest; Next 要件は **≥5.1** |
| `@types/node` | `^26.1.1` | |
| `vitest` | `^4.1.10` | |
| `@playwright/test` | `^1.61.1` | |
| package manager | pnpm（example 単体） | |

Scripts（Next 16 既定 = Turbopack。`--turbopack` 不要）:

```json
{
  "dev": "next dev -p 3014",
  "build": "next build",
  "start": "next start -p 3014",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

- `next lint` は **削除済み** → lint するなら ESLint CLI / Biome を別途（初回 slice では typecheck+test を優先可）
- `middleware.ts` は非推奨（→ `proxy.ts`）。本 example は **proxy 不要**（actor は cookie / header を Action・RH・RSC で読む）

#### Next.js 16 実装上の必達（公式 upgrade guide）

| 項目 | 本 example での扱い |
| --- | --- |
| **Async Request APIs** | `params` / `searchParams` / `headers()` / `cookies()` は **必ず `await`**。同期アクセスは 16 で撤去 |
| **Route Handler 型** | `ctx: RouteContext<'/api/drafts/[id]'>` + `const { id } = await ctx.params`（`next typegen` 可） |
| **RH キャッシュ** | 既定は **キャッシュしない**。draft/SoR は request-time のまま。`cacheComponents` は **有効にしない** |
| **Server Actions** | UI mutation の主経路。`'use server'` ファイルから deep module を呼ぶ。**Action 内で認可** |
| **RSC** | 読取の主経路。page は module query + client island への props。**page から自己 `fetch('/api/...')` しない** |
| **post-mutation UX** | SA 成功後: save/next は `revalidatePath` または結果を client に返して form reset; submit は `redirect` |
| **Turbopack default** | custom webpack を入れない |
| **React Compiler** | 初回 non-goal |
| **Cache Components / `"use cache"`** | **off**（mutable draft と衝突しやすい） |
| **Node** | `>=20.9` |

形（イメージ）:

```ts
// src/app/drafts/[id]/page.tsx — RSC
import { get } from "@/modules/drafting"
import { Wizard } from "@/ui/wizard/wizard"

export default async function Page(props: PageProps<'/drafts/[id]'>) {
  const { id } = await props.params
  const sp = await props.searchParams
  const actor = await resolveActor()
  const view = await get(actor, id) // no self-fetch to /api
  return <Wizard initial={view} step={sp.step} />
}

// src/app/actions/drafts.ts
'use server'
import { save } from "@/modules/drafting"

export async function saveDraftAction(id: string, patch: DraftPatch) {
  const actor = await resolveActor()
  return save(actor, id, patch) // same module as RH
}

// src/app/api/drafts/[id]/route.ts
import { save } from "@/modules/drafting"

export async function PATCH(req: Request, ctx: RouteContext<'/api/drafts/[id]'>) {
  const { id } = await ctx.params
  const actor = await resolveActorFromRequest(req)
  const body = await req.json()
  const result = await save(actor, id, body)
  return Response.json(result, { status: statusOf(result) })
}
```

#### State management (three layers)

| Layer | Owns | Does not own |
| --- | --- | --- |
| **Server draft (SoR)** | id, ownerId, payload (partial), lastStepId, updatedAt, status=`open`\|`submitted` | UI step の瞬間表示 |
| **Client form (ephemeral)** | TanStack Form values = working copy; dirty; field errors | 永続化・他タブ共有 |
| **URL** | `?step=` 現在 UI step（navigate only） | 必須進捗の真実（再開 default は server `lastStepId`） |

Resume:

1. **RSC** が `drafting.get` → form `defaultValues` を props で hydrate（主）
2. URL `step` が無ければ `lastStepId` を開く
3. submitted 済みなら PR 詳細 RSC へ（黙って新規 draft を作らない）
4. E2E/API は `GET /api/drafts/:id` でも同じ view を得られる

#### Validation contracts (shared UI + server)

| Schema | Role | Missing fields | Format-invalid |
| --- | --- | --- | --- |
| `draftPatchSchema` | PATCH body | **許容**（部分マージ） | **拒否** |
| `stepBasicsSchema` / `stepLinesSchema` | Next / step gate | step 必須は拒否 | 拒否 |
| `stepReviewSchema` | review 表示用（readiness 投影） | submit 前の不足一覧 | — |
| `submitSchema` | POST submit | すべて拒否 | 拒否 |

`submitSchema` は domain 完全形。step schema はそこからの **pick / 部分集合**（fullSchema を form 全体 resolver に載せない — multi-step の定石）。

Deep module public API は **Directory structure → `modules/drafting` の public interface** を正とする。

#### HTTP surface (RH — E2E / 契約の正本)

```text
GET    /api/health
GET    /api/drafts
POST   /api/drafts
GET    /api/drafts/:id
PATCH  /api/drafts/:id              # save
POST   /api/drafts/:id/next         # gated next
POST   /api/drafts/:id/submit
GET    /api/purchase-requests/:id
POST   /api/testing/reset
```

#### Server Actions surface (UI 主経路)

```text
createDraftAction()
saveDraftAction(id, patch)
goNextAction(id, stepId, patch?)
submitDraftAction(id)
```

戻りは structured result（`{ ok, ... }`）。throw で業務エラーを表さない（UI が fieldErrors を載せるため）。  
submit 成功時のみ `redirect` してよい。

Error body（RH）/ result（SA）: `{ code, message, fieldErrors? }`（silent ignore 禁止）。

#### Domain fields (minimal for teaching)

| Step | Fields |
| --- | --- |
| `basics` | title (required on step), vendorName (required on step), neededBy (optional date string; format if present), note |
| `lines` | lines[]: sku, quantity (>0 if present), unitPrice (optional) — step 通過に 1 行以上 |
| `review` | 不足一覧 + submit CTA（入力なし） |

#### Client UI state flow

```text
list (RSC) → New (createDraftAction) → redirect /drafts/:id
  → RSC loads drafting.get → Wizard(initial)
  → Next: client step check → goNextAction → update form/URL
  → Save: saveDraftAction
  → review: readiness from view / submitSchema projection
  → Submit: submitDraftAction → redirect /purchase-requests/:id (RSC)
E2E may use RH equivalents instead of Actions.
```

#### Step navigation (decided)

**Gated Next**: 未来 step へは当該 `step*Schema` 通過後のみ。過去 step は戻れる。Save は部分保存のみで step を進めない。

#### Contrast with other examples

| Example | Relevant difference |
| --- | --- |
| `approval-flow` | draft は申請 **status**; RH+domain のみ。こちらは **未完成 payload** + **RSC/SA/RH → 同一 deep module** |
| `concurrent-edit` | 完成エンティティの OCC; こちらは partial draft + last-write-wins |
| `async-export` | SA+RH 二重入口はあるが超過軸は非同期ジョブ。こちらは **段階スキーマ + RSC 読取** |
| `fulfillment-desk` | 外部 SoR; こちらは app store |

#### Evidence notes（2026-07-20 調査）

**Next.js 16（一次: 公式）**

- [Next.js 16 blog](https://nextjs.org/blog/next-16) · [Upgrade to 16](https://nextjs.org/docs/app/guides/upgrading/version-16) · [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- npm `next@latest` = **16.2.10**（調査時点）; Node **≥20.9**; TS **≥5.1**
- Turbopack が `dev`/`build` の既定; `middleware` → `proxy` 改名（edge 以外）
- Async Request APIs の同期互換は **16 で完全削除**
- Cache Components / `"use cache"` は opt-in; 既定は dynamic に近い request-time
- `next lint` 削除; lint は ESLint/Biome 直
- RH: 既定 uncached; `RouteContext` + `await params` が現行 API

**周辺 latest（npm view, 同日）**

| pkg | latest |
| --- | --- |
| react / react-dom | 19.2.7 |
| zod | 4.4.3 |
| @tanstack/react-form | 1.33.2 |
| typescript | 7.0.2 |
| vitest | 4.1.10 |
| @playwright/test | 1.61.1 |

**Zod 4**

- stable（[zod.dev/v4](https://zod.dev/v4)）。既存 `async-export` / `concurrent-edit` も `zod@^4`。
- Standard Schema 経由で TanStack Form と接続（`concurrent-edit` と同型）。

**Wizard / form（二次: 設計定石; 拘束力は charter 優先）**

- Save-and-resume: draft vs submitted、step + final 検証、missing≠invalid（[AppMaster](https://appmaster.io/blog/save-and-resume-multi-step-wizard)）
- step schema ⊂ domain full; form に fullSchema を載せない
- Draft ≠ validated output を型で分ける（[Stepperize](https://www.stepperize.com/docs/latest/forms/schema-validation)）
- TanStack Form: step 検証は `parseValuesWithSchema` 合成可（[Huggins](https://matthuggins.com/blog/posts/multi-step-form-validation-with-tanstack-form)）

SearXNG 既定は rate-limit あり; `!ddg` / `npm view` / 公式 docs fetch で確定。

#### Smallest E2E slice (when building)

```yaml
actor_entry: author が New draft（createDraftAction または POST /api/drafts）
path: RSC get → save/goNext Actions → submit Action → PR RSC
  # E2E 代替: RH で create → patch → next → submit → get PR
observable_result: submitted に完全フィールド; open draft への再 save 不可
critical_failure: 空 title の goNext 拒否; 不完全 submit 拒否; 二重 submit は already_submitted
evidence: modules/drafting public unit tests + 1 Playwright path
decision_unlocked: 上記 directory で scaffold してよい
rollback: example 削除のみ（root 影響なし）
```
Implemented under [`examples/draft-wizard/`](./draft-wizard/).

## Reserved themes (not implemented)

Slugs and teaching axes are **reserved** so later work does not collide or dilute
the gap map. Each still needs a charter before scaffold.

Do **not** create `examples/<slug>/` for these until explicitly building that theme.
Do **not** fold these axes into existing examples as drive-by features.

| # | Slug (reserved) | Intent | Primary axes (exceed candidates) | Status |
| --- | --- | --- | --- | --- |
| 3 | `audit-trail` | Who/when/what/why on sensitive changes | append-only events, history as projection, read-only audit role | reserved |
| 4 | `draft-wizard` | Multi-step create with draft + staged validation | draft vs submit schemas, partial save, resume by id | **done** |
| 5 | `field-level-authz` | Same screen, different fields by role | field-level allow/mask, API drops fields (not UI-only hide), unmask audit | reserved |
| 6 | `saved-search` | Saved queries coexisting with SoR filter limits | persisted query, SoR constraint honesty, optional facets | reserved |
| 7 | `kobutsu-satei` | CMS ルール多層合成で古物査定フォームを動的構築 | multi-layer rule composition, same evaluator dual surface, rule version pin (create+repin) | **done** (see [`kobutsu-satei/`](./kobutsu-satei/)) |
| 8 | `account-desk` | 取引先オペレーション（階層・複数住所/担当・与信・完備性・関連投影）の list/detail/edit | dense aggregate IA + anti-slop craft（flat 顧客禁止） | **done** (see [`account-desk/`](./account-desk/)) |

### Gap map (what these cover that done examples do not)

| Gap | Covered by |
| --- | --- |
| Time / long-running work | `async-export` (done) |
| Concurrent writes | `concurrent-edit` (done) |
| Accountability / evidence | `audit-trail` |
| Input lifecycle / wizards | `draft-wizard` (done) |
| Field-level authorization | `field-level-authz` |
| Saved search + SoR limits | `saved-search` (thin alone; may attach to another theme later) |
| Configuration-driven form / rule-as-data | `kobutsu-satei` (done) |
| List / detail / edit information design (dense aggregate, anti-decoration) | `account-desk` (done) |

`saved-search` may stay a thin standalone or land as a sub-feature of another
example; the **slug and axis stay reserved** either way until decided at build time.

## Design archive: `kobutsu-satei` (charter — not implemented)

Charter only. Do **not** scaffold `examples/kobutsu-satei/` until explicitly building.
Legal notes below are **teaching simplifications**, not legal advice.

### `kobutsu-satei` — 古物査定のルール駆動フォーム

| | |
| --- | --- |
| Intent | CMS 管理の多層ルールを評価し、入力条件に依存して査定フォーム・必須・成約ゲートを動的構築する |
| Domain | 日本の古物商における **査定 → 買取確定（台帳投影）+ 不正品申告 stub**（店頭 + 宅配の簡易） |
| Teaching core | rule-as-data; 法令レイヤ × 品目カタログ × 査定方針の **合成** |
| Stack | **TanStack family**（Start + Router + Query + Form + Table）。`concurrent-edit` と同系統、超過軸は別 |
| SoR (planned) | 自前 in-memory（査定チケット・ルール set・台帳投影・不正品申告）。外部 eKYC / 警察 API なし |
| Status | **done** — 実装は [`kobutsu-satei/`](./kobutsu-satei/) |

**Exceeds prior on**

| Axis | Intentional exceed |
| --- | --- |
| Multi-layer rule composition | `catalog` + `compliance` + `appraisal` を合成して FormPlan を生成。単一 when テーブルや固定 step スキーマにしない |
| Same evaluator, dual surface | UI（show/require）と server（最終検証・成約拒否・台帳投影）が **同一 `evaluate()`** |
| Rule version pin | **create 時に pin** + **明示 repin** でのみ現行 active へ更新。黙って最新に追従しない |

**Non-goals**

- 本物 eKYC / IC 読取 / JPKI / **警察への実通報 API** / 実ファイル永続
- 相場エンジン・在庫・販売・オークション・出金
- 承認ワークフロー（`approval-flow`）
- OCC / 同時編集 UX を主題にすること（`concurrent-edit` の軸。スタックは共有してよい）
- 固定多段 wizard の draft/submit 段階契約を主題にすること（`draft-wizard`）
- フィールド権限マスクを主題にすること（`field-level-authz`）
- 13 品目フル実装、任意 JS ルール DSL、循環ルール
- ビジュアルルールビルダ（ノードエディタ）
- 本物 IdP / 多テナント

#### Outcome (provisional)

```text
査定オペレータがチャネル・品目・金額・状態を入力すると、
有効 RuleSet の評価結果としてフォームが変わり、
同一評価で server が成約を許可/拒否し、
許可時のみ古物台帳投影に必要な項目が揃った記録が残る。
疑義時は不正品申告 stub を残せる（外部通報はしない）。
コンプラは CMS でルール version を切り替えられる（例: 少額でも ID 必須の品目追加）。
```

#### Knowledge labels

| Kind | Item |
| --- | --- |
| **fact** | 既存: `draft-wizard` = コード固定の段階スキーマ; 本テーマ = **ルール評価結果がスキーマ** |
| **fact** | 既存: `concurrent-edit` = TanStack Start family + OCC。本テーマは **同 family・別超過軸（rule composition）** |
| **fact** | 古物営業法の防犯三大義務（相手方確認・不正品申告・帳簿記録）が買取オペの骨格 |
| **fact** | 対価総額 1 万円未満は本人確認・帳簿が原則免除。例外品目は金額無関係に義務（ゲームソフト、書籍、光メディア、自動二輪等。2025-10-01 より室外機・ヒートポンプ・電線・金属グレーチング追加 — 警視庁解説） |
| **fact** | 帳簿の骨子: 年月日、品目・数量、特徴、相手方住所氏名職業年齢、確認措置の区分。保存はおおむね 3 年 |
| **fact** | 貴金属等 × 現金 200 万円超は犯収法の取引時確認が重なり得る（教育用に限定採用） |
| **decision** | ドメインは **古物査定〜買取確定 + 不正品申告 stub**。承認・精算・再販・警察 API は非目標 |
| **decision** | ルールは **3 層**: `catalog` / `compliance` / `appraisal`。評価順は catalog → compliance → appraisal（後段が前段の computed を参照可） |
| **decision** | 公開 seam は deep module 1 つ（仮称 `features/satei` または `modules/satei`）: `evaluate` / ticket CRUD / `accept` / `reportSuspicious` / rule CMS の最小面 |
| **decision** | 初回カテゴリは **4 種のみ**: `game_soft` / `apparel` / `watch_jewelry` / `ac_outdoor`（室外機 = 改正デモ） |
| **decision** | チャネルは `store` \| `mail_in` の 2 つ（訪問買取は non-goal） |
| **decision** | 真贋結果は `pass` \| `hold` \| `reject`。UI 文言は「偽物」断定を避け **買取基準外 / 保留**（実務慣習に合わせる） |
| **decision** | 法令コンプラ seed は変更しにくいが CMS で version 追加は可（改正ストーリー）。社内上乗せ（全件 ID 等）も compliance 層 |
| **decision** | **Pin = D**: `createTicket` で active RuleSet version を pin。evaluate / accept は **pin 済みのみ**。現行へ合わせるのは **明示 `repinRuleSet`** のみ（自動追従なし） |
| **decision** | **CMS = M**: clone → draft を **構造化フィールド数本**で編集 → publish。ビジュアルビルダ・層全体 JSON 編集は非目標。catalog field defs は seed 固定（CMS 非編集） |
| **decision** | 複数明細の合計金額で 1 万円閾値を判定（単品のみに簡略しない） |
| **decision** | **不正品申告を入れる**: appraiser が open チケットから `reportSuspicious`。SoR に `SuspiciousReport` を append。警察 API・外部送信なし |
| **decision** | 教育用簡略である旨を README に明示。条文の網羅・非対面 15 手法の完全実装はしない |
| **decision** | **スタック = TanStack family**: Start (Vite) + Router + Query + Form + Table。RPC は `createServerFn`。超過軸はルール合成であり monorepo 分割ではない |
| **assumption** | actor stub: `appraiser` / `compliance` / `viewer` |
| **assumption** | 本人確認の「完了」は stub フラグ（`idCheck.status`）。実画像・eKYC ベンダーなし |
| **assumption** | 1 チケット = 1 売主 + 1..n 明細。法人売主は初回 non-goal |
| **assumption** | repin は `open` のみ。accept 済みは repin 不可（台帳は成約時 version のまま） |

#### Rule layers

```text
L0 Context (runtime, not CMS)
  channel, actor, ticket.ruleSetVersion, now

L1 catalog   … 品目 → 査定フィールド定義・取扱可否
L2 compliance… 本人確認要否・手段フィールド・台帳必須・AML 追加
L3 appraisal … 状態/付属/真贋 → require・block・買取可否

evaluate(ctx, values, ruleSet) → FormPlan
  FormPlan = {
    fields: [{ id, visible, required, disabled, options? }],
    computed: { needIdentity, needAml, totalAmount, ledgerReady, buyable },
    blocks: [{ code, message }],  // accept 不可理由
    ledgerProjection?: { ... }    // accept 時に書く形
  }
```

**Condition 語彙（初回）**

```text
all | any | not
field op value     // == != >= > <= < in exists
computed.*         // evaluate 内で順に埋める派生値
```

**Effect 語彙（初回）**

```text
show | hide | require | unrequire
set_options
set_computed
block_accept (reasonCode)
project_ledger (keys)
```

禁止: 任意コード実行、ネットワーク、他チケット参照、循環 `set_computed`。

#### Compliance 合成（教育用モデル）

```text
# 明細ごと or チケット合計で評価する派生（実装時に確定）
totalAmount = sum(line.offerAmount)

alwaysIdItem = any line where category in
  { game_soft, book, optical_media, motorcycle, ac_outdoor, electric_wire, metal_grating, ... }
  # 初回 seed では game_soft と ac_outdoor を必ず入れる

needIdentity =
  policy.forceIdentityAll   # 社内上乗せ（CMS）
  OR totalAmount >= 10000
  OR alwaysIdItem

needAml =
  any line in watch_jewelry (or precious flag)
  AND paymentMethod == cash
  AND totalAmount > 2_000_000

# channel は needIdentity 成立後に手段フィールドを分岐
if needIdentity && channel == store  → require id document fields (stub)
if needIdentity && channel == mail_in → require remoteIdMethod (enum stub)

ledgerReady =
  needIdentity implies id fields complete
  AND needAml implies aml fields complete
  AND all visible required appraisal fields complete
  AND appraisal outcome != reject
  AND appraisal outcome != hold   # hold は成約不可（再査定）
```

#### Appraisal 合成（カテゴリ別の最小セット）

| category | 主な査定フィールド | ゲート例 |
| --- | --- | --- |
| `game_soft` | title, platform, working, package | working=false → 減額可だが reject ではない（seed 次第） |
| `apparel` | brand, size, condition grade | condition=unusable → reject |
| `watch_jewelry` | brand, model, serial, materials, boxPapers, authenticity | authenticity=reject → block; hold → block |
| `ac_outdoor` | maker, modelNumber, serialOrLot, notes | serial 欠落 → require notes + hold 可 |

共通: `authenticity` またはカテゴリ固有の真贋。reject 時は **accept 不可**（台帳に買取行を作らない）。

#### Actors

| Actor | Can |
| --- | --- |
| `appraiser` | チケット作成・編集・evaluate・accept・**不正品申告**・**自チケット repin**（open のみ） |
| `compliance` | RuleSet 一覧 / **clone・M キー編集・publish** / チケット・申告閲覧 / 任意チケット repin 可でも可（初回は appraiser 自チケット + compliance 全件でよい） |
| `viewer` | チケット・評価結果・申告・RuleSet の閲覧のみ |

#### Domain objects (minimal)

```text
RuleSet {
  version, status: draft|active|retired, layers, createdAt,
  # M で編集する compliance 上書き（catalog/appraisal の重い定義は seed 固定でも可）
  editable?: { identityThresholdYen, alwaysIdCategories, forceIdentityAll, amlCashThresholdYen }
}
Ticket  {
  id, ownerActorId,
  channel, paymentMethod?,
  seller: { name?, address?, occupation?, age?, ... },  # needIdentity 時に必須化
  idCheck: { status, method?, docType?, ... },          # stub
  aml?: { purpose?, ... },
  lines: [{ category, offerAmount, attrs... }],
  authenticity?: pass|hold|reject,
  ruleSetVersion,   # pin at create; change only via repinRuleSet
  status: open|accepted|closed_without_accept,
  ledgerEntryId?,
  suspiciousReportIds: string[]
}
LedgerEntry { ...法定骨子の投影, ticketId, ruleSetVersion, acceptedAt }
SuspiciousReport {
  id, ticketId, reportedBy, reportedAt,
  reasonCode,   # e.g. suspected_stolen | serial_tamper | other
  note,         # required free text (min length)
  lineIndexes?, # optional which lines
  disposition: recorded  # stub only; no external send
}
```

#### 不正品申告 stub（決定: 入れる）

| | |
| --- | --- |
| 目的 | 三大義務の「申告」を **操作として見せる**（accept と直交） |
| いつ | `open` チケット上。accept 前後どちらでも可だが、初回は **accept 前**を主デモ |
| 必須 | `reasonCode` + `note`（短すぎ拒否） |
| 効果 | `SuspiciousReport` を append。チケットに id を紐付け。UI に「申告済み」表示 |
| しないこと | 警察 API、メール、ワークフロー、申告後の自動買取禁止（任意で block を CMS にしてもよいが **初回 non-goal**） |
| 認可 | `appraiser` 作成、`compliance`/`viewer` 閲覧 |

`authenticity=reject` や `hold` のとき CTA を強調するとストーリーが繋がるが、**申告は任意**（強制しない — 強制は appraisal ルールで後から足せる）。

#### Stack（決定: TanStack family）

| Layer | Choice |
| --- | --- |
| App | TanStack Start (Vite) |
| Router | `@tanstack/react-router` file routes |
| Server state | TanStack Query + SSR query 連携（`concurrent-edit` と同型） |
| RPC | `createServerFn` → deep module |
| Form | `@tanstack/react-form` + Zod 4 Standard Schema（**FormPlan 駆動の動的 fields**） |
| List | `@tanstack/react-table`（チケット一覧・申告一覧・ルール version 一覧） |
| SoR | process-local memory（`*.server.ts`） |
| Package shape | **単一 package**。分割 monorepo は非目標 |

`concurrent-edit` との差: OCC を主題にしない。Form は固定 order schema ではなく **evaluate → FormPlan → 動的 field 生成**。

#### Delivery seam

| 面 | 役割 |
| --- | --- |
| Deep module | `evaluate`, `createTicket`, `patchTicket`, `acceptTicket`, `repinRuleSet`, `reportSuspicious`, `listRuleSets`, `cloneRuleSet`, `updateRuleSetDraft`, `publishRuleSet` |
| routes / server fn | 薄い adapter。**検証ロジックを UI に閉じない** |
| UI | 査定ワークベンチ（FormPlan + repin CTA）+ CMS（M: clone/編集/publish）+ 申告パネル |

**二重実装禁止**: client は FormPlan を表示の主に使ってよいが、accept / report / repin の正は server。

#### Pin 方針 D（決定）

```text
createTicket
  → ticket.ruleSetVersion = current active
  → 以降の evaluate / accept は常にこの version

CMS publish (新 active)
  → 既存 open チケットは **自動では変わらない**
  → 新規 create のみ新 version

repinRuleSet(ticketId)   # explicit only
  → open のみ
  → ticket.ruleSetVersion = current active
  → 次の evaluate から新 FormPlan（必須が増減し得る）
  → accepted は 409 / 拒否
```

UI: pin 中 version と active が違うとき「現行ルールへ更新」を表示（appraiser/compliance）。黙った再評価で version を書き換えない。

#### CMS 方針 M（決定）

| できる | できない（初回） |
| --- | --- |
| active/draft 一覧（Table） | ビジュアルルールビルダ |
| clone → draft | catalog の field def 全文編集 |
| 構造化キー編集 → validate → publish | 層全体の自由 JSON 編集（L） |
| publish で active 切替（旧 active は retired） | 任意 effect/condition の追加 UI |

**編集可能キー（初回の固定セット）**

| Key | 意味 | seed 例 |
| --- | --- | --- |
| `identityThresholdYen` | 本人確認が必要になる対価総額 | `10000` |
| `alwaysIdCategories` | 金額無関係に ID 必須のカテゴリ set | `game_soft`, `ac_outdoor` |
| `forceIdentityAll` | 社内上乗せ・全件 ID | `false` |
| `amlCashThresholdYen` | 犯収法デモ閾値（現金×宝飾） | `2000000` |

clone 時は親 version のキーをコピー。appraisal/catalog の詳細ルールは **コード seed の version 付き RuleSet** に置き、M キーは compliance 合成にマージする形でよい（実装詳細は scaffold 時）。

#### Contrast with other examples

| Example | Relevant difference |
| --- | --- |
| `draft-wizard` | step 固定スキーマ + draft/submit + Next。こちらは **RuleSet 評価で schema 生成** + TanStack |
| `concurrent-edit` | 同 TanStack family。あちら OCC、こちら **rule-as-data** |
| `approval-flow` | 申請ステートマシン。こちらは査定中の **入力ゲート** + 申告 stub |
| `field-level-authz` | ロールで field マスク。こちらは **入力値・品目・法令条件** |
| `async-export` | 時間軸ジョブ。こちらは同期 evaluate |
| `fulfillment-desk` | 外部 SoR。こちらは自前ルール + 台帳投影 |

#### Seed RuleSet v1（ストーリー）

| 層 | ルール要約 |
| --- | --- |
| catalog | 4 カテゴリの field defs; 未知カテゴリは取扱対象外で block |
| compliance | 1 万円閾値; `game_soft`/`ac_outdoor` は always ID; store/mail_in 分岐; watch_jewelry+cash+>2e6 → AML |
| appraisal | watch serial require; authenticity reject/hold → block_accept; apparel unusable → block |

#### Seed RuleSet v2（法改正デモ・CMS ストーリー）

- compliance が v1 を **clone** → M キーで `alwaysIdCategories` 追加 or `forceIdentityAll=true` → **publish**
- 既存 open は pin 維持（自動追従なし）
- **新規** create は v2; 既存 open は **repin** 後に v2 の FormPlan
- E2E: publish 後も未 repin の open は旧ゲート / repin 後は新ゲート

#### Smallest E2E slice (when building)

```yaml
actor_entry: appraiser が store チャネルでチケット作成
paths:
  A_exempt: apparel 単品 8000円 → needIdentity=false → ID ブロック非表示 → accept 可
  B_always_id: game_soft 3000円 → needIdentity=true → ID 未入力で accept 拒否 → ID stub 完了後 accept
  C_aml_or_auth: watch_jewelry 現金 2500000 + authenticity=pass → AML フィールド必須; authenticity=reject → 成約不可
  D_pin_repin: |
    open チケット(v1) 作成 → compliance が M で v2 publish
    → 当該 open はまだ v1（自動不変）
    → 新規は v2
    → 当該 open を repin → v2 の FormPlan に切り替わる
  E_suspicious: authenticity=hold|reject で reportSuspicious → SuspiciousReport が残り accept と独立
observable_result: accept 時 LedgerEntry に法定骨子; 申告は別レコード; pin/repin が観測可能
critical_failure: UI だけ必須を外して server accept が通る / 黙って pin が active に追従する、は禁止
evidence: evaluate unit tests + Playwright 3〜4 path
decision_unlocked: scaffold してよい
rollback: example ディレクトリ削除のみ（root 影響なし）
```

#### Decisions closed

| # | Topic | Decision |
| --- | --- | --- |
| 1 | スタック | TanStack family |
| 2 | pin | **D** — create pin + 明示 `repinRuleSet` |
| 3 | CMS | **M** — clone + 構造化キー数本 + publish |
| 4 | 不正品申告 | stub `reportSuspicious` |
| — | 明細数 | 最大 5 行（既定） |

---

#### Research anchors (non-exhaustive; teaching)

- 警視庁: 古物営業法施行規則改正（令和7年10月1日）— 1 万円未満でも確認等が必要な物品の追加
- 古物台帳記載事項・保存期間の一般解説（行政書士・警察広報）
- 古物営業法の本人確認対象（買受・交換・売却委託）と 1 万円原則免除 + 例外品目
- 不正品の申告義務（三大義務の一。example では SoR stub のみ）
- 犯収法: 貴金属等の高額現金取引時確認（200 万円超）が古物商に重なり得る整理
- ブランド買取実務: コピー品は買取不可 / 「基準外」表現、シリアル・付属による査定分岐

Scaffold 時は一次情報（条文・警察庁/警視庁）を README の「簡略である」注記とセットで再確認すること。

---

## Design archive: `account-desk` (charter — information design first)

**Process gate（厳守）**

```text
1. タスク・情報設計・集約の複雑さ（本文）を合意する
2. 画面ごとの情報配置・seed シナリオを合意する
3. その後に限り scaffold（examples/account-desk/）
```

- **ディレクトリ作成・実装を先にしない。** flat な「名前+メール+住所1つ」顧客で一覧/詳細を切ると、実業務とそぐわず craft の練習にもならない。
- 超過軸は UI craft だが、**車両ドメインは意図的に重い。** 軽量エンティティは non-goal。
- 目的: AI が card 過多・装飾過多に流れがちな業務 UI の **正例** を、実運用に近い情報量で固定する。

### `account-desk` — 取引先オペレーション・デスク

| | |
| --- | --- |
| Intent | 一覧 → 詳細 → 編集（+ 新規）を横断する **業務フロント品質一式**。低認知負荷・高視認性・予測可能性 |
| Domain | **販売取引先（売掛先）オペレーション** — 単票マスタではなく **階層・複数住所・複数担当・与信・完備性・関連集計** を持つ集約 |
| Teaching core | 情報設計（何をどの面に載せるか）+ density language + anti-slop craft |
| Stack (planned) | **TanStack family**（Start + Router + Query + Form + Table）— 情報設計合意後にピン留め確定 |
| SoR (planned) | 自前 in-memory（関連集計も seed 投影。外部 ERP なし） |
| Status | **done** — O1–O8 closed · stack TanStack family · in-example design system |
| Field evidence | [docs/research/account-desk-field-evidence.md](../docs/research/account-desk-field-evidence.md)（SAP / NetSuite / D365 等） |

**Exceeds prior on**

| Axis | Intentional exceed |
| --- | --- |
| 3-surface information design | 一覧・詳細・編集で **同じ密度言語**。比較は table。詳細は section+表/dl。編集は **詳細と同じ区画** の複数セクション form |
| Realistic aggregate density | flat CRUD ではなく、実デスクに必要な **入れ子と派生表示** を持つ（下記 Complexity sources） |
| URL + return path honesty | 一覧条件の URL 復元・詳細往復維持。未保存離脱を仕様化 |
| Anti-slop craft contract | ban リストを文書+token+E2E で固定（実装フェーズ） |

**Why this gap exists**

- 既存 example はドメイン契約が主。UI は runnable floor。
- 薄い顧客エンティティの list/detail は「動く」が、**情報設計の難しさ（何を見せるか・何を畳むか）を再現しない。**
- ガイド §3 の「タスク・情報設計」成果物が、example としてまだ無い。

**Non-goals（意図的に載せない複雑さ）**

| 載せない | 理由 / 正本 |
| --- | --- |
| 一括・page vs all・部分成功 | `bulk-reassign` |
| 非同期ジョブ | `async-export` |
| OCC 本格 | `concurrent-edit`（保存は last-write-wins 可） |
| 多段 draft wizard | `draft-wizard`（新規は **1 ページ複数セクション**） |
| ルール DSL | `kobutsu-satei` |
| 監査イベント本格 | `audit-trail`（詳細の「最近の動き」は **seed 投影の読取専用表** に留める） |
| フィールド権限マスク | `field-level-authz` |
| 請求書発行・入金消込・与信審査 WF | 別システム想定。ここでは **結果とフラグ** だけ |
| root UI kit / Storybook monorepo | promote は別判断 |
| slop 対比モード | ban は文書のみ |

#### Outcome (provisional)

```text
与信・担当・拠点・連絡窓口・データ欠損をまたぐ取引先オペレータが、
一覧で「今動くべき相手」を拾い、詳細で判断材料をスキャンし、
編集で複数区画を矛盾なく更新する業務を、
装飾 card なし・予測可能なデスク UI で完遂できる。
```

---

### Complexity sources（なぜ flat 顧客では足りないか）

実業務の取引先デスクで認知負荷が上がるのは「フィールド数」ではなく次の **構造** である。本 example はこれを **必須** とする。

| # | 複雑さの出所 | オペレータがすること | UI への要求 |
| --- | --- | --- | --- |
| C1 | **法人階層**（親会社・子・請求先） | グループ内のどの法人か見分ける | 一覧に親略称。詳細に親子リンク。編集で parent 変更の影響を明示 |
| C2 | **役割付き住所が複数**（本社 / 請求先 / 出荷先） | 請求と納品の取り違え防止 | 詳細は **住所表**（role 列）。card 1 枚ずつ禁止 |
| C3 | **役割付き担当が複数**（窓口・請求・現場） | 「誰に何を聞くか」 | 詳細・編集とも **担当表**。primary は1人制約 |
| C4 | **商況フラグ束**（status × 与信停止 × 取引停止 × オンボ未完） | 出荷・請求してよいか一瞬で判断 | 一覧に **状態チップ列を1セルに畳む**（バッジ祭り禁止）。詳細ヘッダに主状態 |
| C5 | **完備性（data readiness）** | マスタ不備の洗い出し | 派生 `readiness`（税号欠・請求先欠・担当0 等）。一覧フィルタ `incomplete`。詳細に **不足チェックリスト** |
| C6 | **与信・支払条件**（金額・サイト・通貨・与信停止理由） | 高リスク項目の確認と訂正 | 詳細は scannable dl。編集は section「与信」。suspended/hold 時は **理由必須** |
| C7 | **関連業務の集計投影**（未出荷・延滞・直近受注） | 詳細だけで「今の温度」を掴む | 詳細下部の **関連サマリ表**（読取専用 seed）。カード KPI 4 枚にしない |
| C8 | **長い内部メモ + 短い公開注意** | 緊急注意 vs 経緯 | ヘッダ近傍に `alertNote`（短）。メモは折りたたみ or 下段 |
| C9 | **長い正式名称・海外住所・欠損** | 列崩れ・空表示 | 一覧は truncate+title。欠損は `—` と意味のある空を区別 |
| C10 | **セグメント・タグ（多値）** | キャンペーン対象の絞り込み | 一覧は主要セグメント1つ+件数。詳細はタグ行。編集は multi |

**捨てた「見せかけの複雑さ」:** フィールドを雑に増やす、意味の薄い custom field 20 個、装飾用アクティビティフィード。

---

### Actors and tasks（情報設計の入力）

| Actor | 頻度の高いタスク |
| --- | --- |
| `editor`（営業事務 / マスタメンテ） | 不備取引先の洗い出し、窓口・請求先修正、与信停止の理由付き更新、新規見込みの登録 |
| `viewer`（参照のみ） | 問い合わせ時の「誰の何の法人か」「請求先はどこか」確認 |

| Task id | タスク | 主面 | 判断材料（必須） |
| --- | --- | --- | --- |
| T1 | 今日触るべき取引先を拾う | 一覧 | status/hold、readiness、担当、親、延滞有無 |
| T2 | この法人に請求・出荷してよいか確認 | 詳細 | 商況フラグ、与信、請求先住所、窓口 |
| T3 | 請求先と納品先の取り違え確認 | 詳細 | 住所表（role） |
| T4 | 連絡窓口の追加・primary 変更 | 編集 | 担当表 + primary 一意 |
| T5 | 与信停止 / 再開 | 編集 | creditHold + reason、status 整合 |
| T6 | マスタ不備を埋める | 詳細→編集 | readiness チェックリスト → 該当 section |
| T7 | グループ内の別法人へ移る | 詳細 | 親・子リンク（一覧条件は維持したまま辿れると尚可） |
| T8 | 新規見込み登録 | 新規 | 最小必須 + 後で埋める不備が readiness に出る |

---

### Ubiquitous language（用語）

| 用語 | 意味 |
| --- | --- |
| 取引先（Account） | 売掛・出荷の相手となる法人単位。本 example の集約根 |
| 親取引先 | グループ本社など。請求や与信が親側のこともある（教育上は **表示と parentId のみ**。与信ロールアップ計算は非目標） |
| 住所ロール | `hq` / `bill_to` / `ship_to` |
| 担当ロール | `primary` / `billing` / `operations` / `other` |
| 商況（Trading state） | `status` と `creditHold` / `tradeSuspended` の合成表示 |
| 完備性（Readiness） | 取引に必要なマスタが揃っているか。**派生**（保存しない or 保存しても server 再計算） |
| 関連サマリ | 受注・延滞などの **読取専用投影**（他 SoR のふりをした seed） |

---

### Aggregate model（実装前の正本 — flat 禁止）

```text
Account {
  id, code,                    # code 一意・人が言う識別子
  legalName,                   # 正式名称（長い想定）
  nameKana?,
  tradeName?,                  # 略称・屋号（一覧の主表示に使いやすい）
  status: prospect | active | suspended,
  creditHold: boolean,         # true 時 creditHoldReason 必須
  creditHoldReason?,
  tradeSuspended: boolean,     # 出荷停止など（status と独立し得る）
  tradeSuspendReason?,
  ownerId,                     # 社内担当 stub
  parentAccountId?,            # 階層
  segment: enterprise | mid | smb | public,  # 主セグメント
  tags: string[],              # 多値（上限 e.g. 8）
  industry?,
  countryCode,                 # e.g. JP
  timezone?,                   # 表示用
  taxId?,                      # 法人番号等。active では readiness に効く
  currency: JPY | USD,         # 取引通貨
  creditLimit,                 # currency と対（O4）
  paymentTermsDays,            # 30/45/60…
  invoiceEmail?,               # 請求送付。bill_to 住所と別概念（電子送付先）
  alertNote?,                  # 短い注意（ヘッダ近傍）。一覧には出さない（O6）
  internalMemo?,               # 長い経緯
  addresses: Address[],        # 1..n  role 付き（SAP ship/bill の近似。Payer 独立エンティティは非目標）
  contacts: Contact[],         # 0..n。子は親からコピーしない（NetSuite 同型）
  siteCount?,                  # 拠点数など任意
  # 監査メタ
  createdAt, updatedAt, updatedBy,
}

# 派生（与信）— NetSuite Available Credit に相当。保存しない
# availableCredit = creditLimit - accruedReceivables（OpsSummary or 別投影）


Address {
  id,
  role: hq | bill_to | ship_to,
  isDefaultForRole: boolean,   # 同じ role が複数あるとき default 1
  label?,                      # 「東京DC」等
  postalCode?, prefecture?, line1, line2?,
  countryCode,
}

Contact {
  id,
  role: primary | billing | operations | other,
  name, nameKana?,
  email?, phone?,
  department?,
  isPrimary: boolean,          # 集約内で true は最大1（role と独立した「代表」でも可 — 下記 decision）
}

# 派生（server が計算。一覧・詳細の表示と incomplete フィルタに使う）
AccountReadiness {
  ready: boolean,
  issues: { code, message, section }[],
  # code 例: missing_tax_id | missing_bill_to | missing_ship_to
  #          no_contact | no_primary_contact | missing_invoice_email
  #          credit_hold_without_reason | active_without_bill_to
}

# 読取専用投影（seed。Account と join して詳細に出すだけ）
AccountOpsSummary {
  accountId,
  openOrderCount,
  openOrderAmount,
  overdueInvoiceCount,
  overdueAmount,
  accruedReceivables,          # 与信消化額（available 計算用）
  lastOrderAt?,
  lastPaymentAt?,
}

AccountEvent {               # 直近 N 件。audit-trail の代替ではない
  id, accountId, at, actorId,
  kind: created | updated | status_changed | credit_hold_changed | note,
  summary: string,           # 1行
}
```

#### Invariants（server が強制）

| ID | 規則 |
| --- | --- |
| I1 | `code` 一意 |
| I2 | `addresses` は1件以上。`active` は `bill_to` を1件以上 |
| I3 | 同一 `role` に `isDefaultForRole=true` は最大1。その role が1件なら自動 default |
| I4 | `contacts` 内 `isPrimary=true` は最大1。1件以上いるとき primary 必須（readiness または hard fail — 実装時は **active は hard**） |
| I5 | `creditHold=true` ⇒ `creditHoldReason` 非空 |
| I6 | `status=suspended` ⇒ 理由フィールド（`statusReason` を追加するか tradeSuspend と共有 — 下記 open） |
| I7 | `parentAccountId` は自己参照禁止。深さは表示上2段まで想定（深い木 UI は非目標） |
| I8 | `tags` 上限・文字種を schema で制限 |

#### 旧モデルの廃棄

以前の charter にあった **単一 contact / 単一 address の flat Account** は **破棄**。情報設計の入力に使わない。

---

### 面ごとの情報設計

#### 一覧 `/accounts` — 「拾う」面

**目的:** T1。比較と絞り込み。詳細の代替にしない。

| 領域 | 内容 | 載せない |
| --- | --- | --- |
| Toolbar | q、status、owner、segment、`incomplete`、`creditHold`、件数（確定） | KPI card 行 |
| 表（必須列） | 取引先（tradeName/legalName の主表示+code 副）、商況、完備、親、担当、与信限度、延滞、更新日 | 住所全文、メモ全文、担当全員 |
| 商況セル | status + hold/停止を **1セル内の短いテキスト or 最大2チップ** | 色だけ・アイコンだけ |
| 完備セル | ready / 不備N | issue 全文（詳細へ） |
| 延滞セル | OpsSummary の overdue 件数 or 金額（どちらか一方を主） | グラフ |
| 行 Activate | 詳細へ。query は URL が正 | 行ごとの card |

**URL query（予定）:**  
`q` · `status` · `ownerId` · `segment` · `incomplete` · `creditHold` · `sort` · `page`

**一覧状態コピー:** データなし / 検索0件 / 権限 / 障害を分離（ガイド §9）。

#### 詳細 `/accounts/$id` — 「判断する」面

**目的:** T2–T3, T6 の入口, T7。スクロールは許容。card の入れ子で「っぽく」しない。

```text
[ sticky または page header ]
  戻る（一覧 query 維持） | 主表示名 + code | 商況 | 主操作: 編集
  alertNote（あれば1行、警告色は token 1種）

[ 識別・階層 ]     dl: legalName, kana, parent link, children table (id, name, status)
[ 商況・与信 ]     dl: status, holds+reason, creditLimit, availableCredit（投影）, terms, currency, invoiceEmail, taxId
[ 完備性 ]         issue リスト（section へのアンカー）。ready なら「取引マスタは揃っています」
[ 住所 ]           table: role | default | label | 住所一行 | country
[ 担当 ]           table: primary | role | name | email | phone | dept
[ 分類 ]           segment, tags, industry, country, tz
[ 関連サマリ ]     table 1行集計 or 定義リスト: 未出荷件数/金額, 延滞, 最終受注/入金
[ 最近の動き ]     table: at | actor | summary（最大10行 seed）
[ メモ ]           internalMemo（長文）。alert と分離
[ メタ ]           updatedAt, updatedBy, createdAt
```

**詳細でやらないこと:** インライン編集の散在、関連エンティティのフル CRUD、KPI タイル4枚。

#### 編集 `/accounts/$id/edit` ・ 新規 `/accounts/new` — 「矛盾なく書く」面

**目的:** T4–T6, T8。**詳細と同じ section 順**（空間記憶）。1 ページ。modal 禁止。

| Section | フィールド | 特記 |
| --- | --- | --- |
| 基本 | code（新規のみ or 変更ポリシー決定）、legalName、tradeName、kana、parent、owner、segment、tags… | code 変更可かは scaffold 前に固定（default: **新規のみ入力・以降不変**） |
| 商況・与信 | status、holds、reasons、limit、terms、currency、taxId、invoiceEmail | hold と reason の条件付き必須 |
| 住所 | 行の追加・削除・default。role 付き | **ネスト table/fieldset**。住所を card グリッドにしない |
| 担当 | 行の追加・削除・primary | primary 一意を client+server |
| 注意・メモ | alertNote、internalMemo | 長さ上限 |
| フッター | error summary · Save · Cancel · dirty | summary から section/field へ |

**新規の必須最小:** code, legalName, owner, country, currency, addresses≥1（hq 推奨）, status=prospect 可。  
prospect は bill_to 欠を **許容** し readiness で示す。active 化は編集で I2 を満たす必要あり。

#### 画面間の情報の上げ下げ

| データ | 一覧 | 詳細 | 編集 |
| --- | --- | --- | --- |
| legalName / code / 商況 | ○ 主 | ○ ヘッダ | ○ |
| readiness issues 全文 | 件数のみ | ○ | 間接（保存後に再計算） |
| addresses[] | × | 表 | 表形式入力 |
| contacts[] | ×（owner のみ社内担当） | 表 | 表形式入力 |
| OpsSummary | 延滞の一点 | フル | ×（読取投影） |
| events | × | 直近 | × |
| internalMemo | × | 下段 | ○ |
| alertNote | × or 記号1つ（任意） | ヘッダ | ○ |

---

### Seed シナリオ（実装前に「実例感」を固定）

件数（目安 40–80）より **ストーリー種別** が必須。詳細ストーリーは field evidence の S-A〜S-H。

| Seed | 姿（現場型） | 製品アナロジー | 一覧 | 詳細 |
| --- | --- | --- | --- | --- |
| **S-A** | 健全・sold/ship/bill が1法人に同居 | SAP デフォルト partner 割当 | 普通 | 住所2+・担当2+ · ready |
| **S-B** | **請求は親・納品は子**（子に bill_to なし + alert） | Billing hierarchy: centralized payer 近似 | 子が incomplete | alert「請求は親」+ missing_bill_to |
| **S-C** | active + **creditHold** + 延滞61日超 | D365 days overdue / NetSuite hold | hold·延滞が目立つ | 理由全文 + overdue 投影 |
| **S-D** | 親は与信逼迫、**子は独立して取引可** | NetSuite: 親 limit に子を含めない | 行単位の商況（親赤≠子赤） | 親子で available が別 |
| **S-E** | prospect・担当0・税号欠 | Prospect vs Customer Account の段差 | incomplete | readiness 複数 issue |
| **S-F** | 正式名が極端に長い + ship_to 複数 default1 | 一覧主表示=tradeName | truncate | 住所表 default |
| **S-G** | **延滞0なのに手動 hold**（クレーム調査） | D365 force credit hold | hold のみ | 理由と関連サマリが矛盾しないよう両方表示 |
| **S-H** | 支払サイト長い + 条件変更 event | D365 terms change の気配 | terms は出さず | events に変更1行 |
| S-I | suspended + statusReason | account status block | 商況 | 理由（O1） |
| S-J | primary 不在の active | 連絡先不備 | incomplete | no_primary_contact |

E2E 優先: **S-B, S-C, S-D, S-E**（階層・請求取り違え・hold・完備性）。

---

### Routes (planned)

```text
/accounts
/accounts/new
/accounts/$accountId
/accounts/$accountId/edit
```

| 遷移 | 仕様 |
| --- | --- |
| 一覧 → 詳細 | 行 Activate |
| 詳細 → 一覧 | 戻る。**一覧 query 維持** |
| 詳細 → 子/親 | 詳細間移動。一覧 query は session か returnTo で保持 |
| 詳細 → 編集 | 主 CTA。viewer は無し + API 拒否 |
| 編集 → 詳細 | Save 後。Cancel は dirty 確認 |
| readiness issue クリック | 編集の当該 section（hash or focus） |

---

### Full-spec inventory（面品質 — ドメイン充足が前提）

| 面 | 必達 |
| --- | --- |
| 一覧 | 上記列・フィルタ・URL・状態区別・table-first |
| 詳細 | 上記 section 一式。住所/担当は **表**。関連サマリと events は読取専用 |
| 編集 | 同 section 順・ネスト集合の編集・error summary・条件付き必須 |
| 横断 | token、ban リスト、キーボード主経路、viewer 拒否 |

---

### Craft contract（anti-slop）

| 禁止 | 代わりに |
| --- | --- |
| 比較行の card grid | `<table>` |
| 詳細の住所/担当を card の山 | `<table>` / 密な stack |
| 上部 KPI card 4 枚 | 一覧は件数1行。詳細の関連は **1サマリブロック** |
| 多重 shadow / gradient / 大きい radius | 1px border · focus ring |
| 空/0件/エラー同一 art | 状態別コピー |
| 複数 section 編集を modal に詰める | ページ |
| flat 顧客で「完成」扱い | 本情報設計を満たすまで scaffold しない |

---

### Delivery seam (planned — 情報設計合意後)

| 層 | 役割 |
| --- | --- |
| `features/accounts/model` | schema · invariants · readiness 純関数 · filter/sort/page · authorize |
| `features/accounts/api` | memory SoR · ops/event seed · server fn |
| `features/accounts/ui` | list / detail / form sections（**layout primitives 共有**） |
| `routes/*` | URL・loader のみ |
| `styles/` | density tokens |

**二重実装禁止:** readiness・filter の意味は server（pure を共有してよい）。

---

### Contrast

| Example | 差 |
| --- | --- |
| `concurrent-edit` | 明細 OCC。こちらは **集約の情報設計** |
| `draft-wizard` | 段階 schema。こちらは **1ページ多 section + 入れ子集合** |
| `fulfillment-desk` | 外部 SoR。こちらはマスタ集約 + 投影 |
| `bulk-reassign` | 一括。こちらは単票の密度 |

---

### E2E（scaffold 解禁条件の一部）

```yaml
paths:
  incomplete_filter: incomplete=1 → S2 系が残る → 詳細で issue → 編集で bill_to 追加 → ready
  credit_hold: S3 の hold 理由が詳細で読める → 編集で解除と理由クリアの整合
  hierarchy: S5 親詳細から子へ → 一覧に戻ると query 維持
  nested_form: 担当 primary を2人にできない（client+server）
  list_restore: 複合 filter → 詳細 → 戻る
  empty_vs_zero: 別コピー
  viewer: edit 直打ち拒否
  keyboard: 主経路完遂
critical_failure: |
  flat 1 contact/1 address のみの実装、
  一覧 card grid、
  readiness なし、
  住所/担当が card 山
```

**scaffold 解禁:** 下記 Decisions がクローズし、ユーザーが実装を明示したとき。

---

### Decisions closed

| # | Topic | Decision |
| --- | --- | --- |
| 1 | プロセス | **情報設計 → 合意 → scaffold**。ディレクトリ先行禁止 |
| 2 | ドメインの重さ | flat 顧客破棄。C1–C10 を必須の複雑さとする |
| 3 | 成果物 | list + detail + edit + create の正例（slop 対比なし） |
| 4 | 関連データ | OpsSummary / Event は **読取専用 seed 投影**（他 example の軸を侵食しない） |
| 5 | 編集 UI | ページ・詳細と同 section 順・入れ子は表形式 |
| 6 | 一括/OCC/async | 非目標 |
| 7 | 認可 | editor / viewer |

### Decisions closed（O1–O8 · stack · DS）

| # | Topic | Decision |
| --- | --- | --- |
| O1 | suspended 理由 | **`statusReason` 独立**（creditHoldReason と別） |
| O2 | primary | **`isPrimary` + role** |
| O3 | code | **作成後不変** |
| O4 | 与信金額 | **currency + 数値** |
| O5 | 子の載せ方 | **詳細の子表のみ**（一覧は parent 列） |
| O6 | alertNote 一覧 | **出さない**（詳細ヘッダのみ） |
| O7 | availableCredit | **詳細のみ**（一覧は hold / 延滞を優先） |
| O8 | Payer | **bill_to + invoiceEmail で近似**（独立 Payer エンティティなし） |
| Stack | 配信 | **TanStack family**（Start + Router + Query + Form + Table）· 単一 package · 依存は実装時点の npm latest |
| DS | 配置 | **example 内 `src/design-system/`**（root 共有 kit にしない）。Carbon productive density / PatternFly token 思想 / GOV.UK error summary を根拠に **自前 token + 薄い primitives**。Carbon/MUI/Radix 等の UI キットは **入れない** |
| Styling | エンジン | **Tailwind CSS v4 + CSS 変数 token**（utility は token にマップ。装飾 shadow 禁止を token で強制） |

調査正本: [account-desk-field-evidence.md](../docs/research/account-desk-field-evidence.md)。

#### Research anchors（短縮）

| テーマ | ソース |
| --- | --- |
| Partner functions（sold/ship/bill/payer） | [SAP Partner Determination Example](https://help.sap.com/docs/SAP_S4HANA_CLOUD/a376cd9ea00d476b96f18dea1247e6a5/0e71bd534f22b44ce10000000a174cb4.html) |
| Subcustomer・与信非合算・contact 非コピー | [NetSuite Subcustomer](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1085616.html) |
| Credit hold ルール（延滞・status・terms・force） | [MS Learn Credit holds](https://learn.microsoft.com/en-us/dynamics365/finance/accounts-receivable/cm-sales-order-credit-holds) |
| Billing vs CRM hierarchy | [DealHub Billing Hierarchy](https://dealhub.io/glossary/billing-hierarchy/)（二次） |
| Available credit / hold Auto | NetSuite schema + 二次解説（evidence ドキュメント参照） |
