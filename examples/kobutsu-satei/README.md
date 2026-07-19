# kobutsu-satei

日本の **古物査定** を題材に、CMS 管理の多層ルールから入力条件依存のフォームと成約ゲートを動的構築する example。

> **教育用簡略です。法務意見・実務コンプラの代替ではありません。**

## Quality charter

| Axis | Intentional exceed |
| --- | --- |
| Multi-layer rule composition | catalog → compliance → appraisal を合成して `FormPlan` を生成 |
| Same evaluator, dual surface | UI プレビューと server `accept` が同一 `evaluate()` |
| Rule version pin | **create 時 pin** + **明示 `repinRuleSet`**（黙って active 追従しない） |

**Exceeds prior on:** rule-as-data の多層合成と pin/repin。スタックは `concurrent-edit` と同系 TanStack family。

## Stack

| Layer | Choice |
| --- | --- |
| App | TanStack Start (Vite) |
| Router | `@tanstack/react-router` |
| Server state | TanStack Query |
| RPC | `createServerFn` |
| Form | 動的 fields（`evaluate` → FormPlan）|
| List | `@tanstack/react-table` |
| SoR | process-local memory |

## Structure

```text
src/
  routes/                 # 配線のみ
  features/satei/
    model/
      seed-rules.ts       # catalog + appraisal の seed（RuleSet.layers に clone）
      evaluate.ts         # L1 catalog → L2 compliance → L3 appraisal → FormPlan
      ticket-paths.ts     # FormPlan field id ↔ Ticket の唯一の read/write
      editable.ts         # CMS M キー検証 · diff · impact
      types.ts
    api/                  # *.server · *.functions · queries
    ui/                   # ticket list/workbench · rules CMS
  shared/actor
```

### Rule package (pinned)

| Layer | Source | CMS M |
| --- | --- | --- |
| `layers.catalog` | seed (4 categories · field defs · requiresAuthenticity) | read-only |
| `layers.appraisal` | seed (declarative rules) | read-only |
| `editable` | seed + CMS | **edit** |

`createTicket` / clone 時に full package を pin。evaluate は **pinned RuleSet のみ**参照。

### Form

- UI は **FormPlan.fields だけ**を描画（`ticket-paths` で get/set）
- client `evaluate(draft, pinnedRuleSet)` と server accept は同一関数
- 明細はカテゴリ変更可（attrs クリア）· 提示額 ≥1 · 室外機 serial 欠落時 notes 必須 等は appraisal 規則

## Shows

- 品目×金額×チャネルで `needIdentity` / `needAml` が変わる
- always-ID 品目（`game_soft`, `ac_outdoor`）は 1 万円未満でも本人確認
- 真贋 `hold`/`reject` で成約ブロック
- **CMS (M) 完了**
  - RuleSet 一覧（Table）・詳細選択
  - active / 任意版からの **clone → draft**
  - 編集キー: `identityThresholdYen` / `alwaysIdCategories` / `forceIdentityAll` / `amlCashThresholdYen` + label
  - client+server 検証、dirty、parent 差分、シナリオ影響プレビュー
  - **save draft** / **publish**（旧 active → retired）/ **discard draft**
- pin 維持 + 明示 repin
- 不正品申告 stub（警察 API なし）

## Non-goals

- 本物 eKYC / 警察 API / 相場 / 承認フロー / OCC
- ビジュアルルールビルダ / 13 品目フル

## Run

```bash
cd examples/kobutsu-satei
pnpm install
pnpm dev          # http://127.0.0.1:3015
pnpm test
pnpm typecheck
pnpm test:e2e
```

### Actor stub

Cookie `kobutsu-satei-actor` / header `x-actor-id`。

| Actor | Can |
| --- | --- |
| `appraiser` | 査定・成約・申告・repin |
| `compliance` | 上記 + CMS clone/edit/publish |
| `viewer` | 閲覧のみ |

### Demo paths

1. apparel 8,000 円 → ID 不要 → 成約  
2. game_soft 3,000 円 → ID 必須 → 成約  
3. CMS で `forceIdentityAll` publish → 既存 open は不変 → repin で ID 必須化  
4. authenticity=hold → 不正品申告 stub  

## API (testing)

```text
POST /api/testing/reset
POST /api/testing/create-ticket   # body: { "channel": "store" | "mail_in" }
```

E2E の主経路は testing create + ワークベンチ操作。UI の「新規」ボタンも serverFn 経由で同じ `createTicket` を呼ぶ。
