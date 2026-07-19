# async-export

条件付きの一覧から **非同期ファイル出力** を依頼し、進捗を追って成果物を受け取る業務画面の example。

## Quality charter

| Axis | Intentional exceed |
| --- | --- |
| Time / long-running work | `accepted → running → completed \| failed` を第一級の状態として扱う |
| Non-immediate result contract | 依頼は **受付** まで。成果物は完了後の別経路 |
| Job failure kinds | 業務語メッセージ + 部分成功ファイルなし |
| Criteria immutability | 受付時スナップショット |
| Mid-flight authz | 処理実行時の再認可 |
| **Structure** | **単一 package + Feature 縦割り**（workspace / packages なし） |

**Exceeds prior on:** 時間軸の非同期ジョブ契約 + example 構造として feature slice（`shipments` / `export-jobs`）。

## 構造（Feature 縦割り + Entity）

```text
examples/async-export/          # 唯一の package
├── src/app/                    # ルーティング・薄い配線のみ
├── src/widgets/                # feature 合成（workbench）
├── src/features/
│   ├── shipments/              # 一覧 UI・クライアント取得
│   └── export-jobs/            # 依頼・進捗・成果物・失敗
├── src/entities/
│   └── shipment/               # 型・filter・読み取り SoR（両 feature が依存）
└── src/shared/
    ├── actor/
    ├── catalog/
    └── testing/
```

**依存方向（feature 同士は import しない）:**

```text
app / widgets
  → features/shipments  ──▶  entities/shipment  ──▶  shared
  → features/export-jobs ──▶  entities/shipment  ──▶  shared
```

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15 App Router（単一 package） |
| Mutations | Server Actions（`features/export-jobs/actions`） |
| Reads / download | Route Handlers（`src/app/api/*` → feature server） |
| SoR | プロセス内メモリ（feature ごとの store） |

## Run

```bash
cd examples/async-export
pnpm install
pnpm dev          # http://127.0.0.1:3013
pnpm test
pnpm typecheck
pnpm test:e2e
```

### Actor stub

Cookie `async-export-actor` と header `x-actor-id`。

| Actor | 倉庫 | 依頼の可視範囲 |
| --- | --- | --- |
| `clerk` | WH-A, WH-B | 自分の依頼のみ |
| `manager` | WH-A, WH-B, WH-C | 組織内 |
| `admin` | 全倉庫 | 全依頼 |
| `outsider` | なし | 依頼不可 |

### 仮置き上限

| 項目 | 値 |
| --- | --- |
| 1 依頼あたり行数 | 25 |
| 成果物保管 | 7 日 |
| 処理遅延 | ~350ms → running → ~400ms 完了 |

E2E は `POST /api/testing/process-now` でタイマーを飛ばせる。

## API

```text
GET  /api/health
GET  /api/shipments?...
GET  /api/export-jobs
POST /api/export-jobs              # 202 + job
GET  /api/export-jobs/:id
GET  /api/export-jobs/:id/download
POST /api/testing/reset
POST /api/testing/process-now
POST /api/testing/revoke-scope
DELETE /api/testing/revoke-scope
POST /api/testing/expire-artifact
```

Server Action: `createExportJobAction(criteria)`（`app/actions` は re-export）

## Non-goals

- 帳票 PDF / スケジュール実行 / 外部ジョブキュー
- monorepo packages 分割
- リアル IdP
