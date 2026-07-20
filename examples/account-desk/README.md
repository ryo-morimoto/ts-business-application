# account-desk

取引先（売掛先）の **一覧 · 詳細 · 編集 · 新規** を、低認知負荷・高密度のデスク UI で実装する example。

AI が崩れがちな **card 過多・装飾過多** を避け、比較は table、詳細は section + 表、編集は同順のページ form に固定する。

## Quality charter

| Axis | Intentional exceed |
| --- | --- |
| 3-surface information design | 一覧/詳細/編集で同じ密度言語。table-first。nested 住所・担当は表 |
| Realistic aggregate | 階層・複数住所/担当・与信・完備性・関連投影（flat 顧客禁止） |
| URL + return honesty | 一覧条件は URL 正本。詳細往復で維持 |
| In-example design system | Carbon productive density / PatternFly token 思想 / GOV.UK error summary を根拠に **自前 token + primitives**（UI キット非依存） |

**Exceeds prior on:** 情報設計とデスク UI craft。ドメイン契約の新規性（OCC 等）ではない。

## Design system

正本: [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)

- `src/design-system/tokens.css` — 唯一の raw 値
- `src/design-system/components/*` — 薄い primitives
- **入れない:** MUI / Carbon React / Radix / shadcn 一式

Field evidence: [../../docs/research/account-desk-field-evidence.md](../../docs/research/account-desk-field-evidence.md)

## Stack

| Layer | Choice | Pin policy |
| --- | --- | --- |
| App | TanStack Start (Vite) | npm latest at scaffold |
| Router / Query / Table | TanStack | 同上 |
| Validation | Zod 4 | server + client 同一 schema |
| Form | Controlled state + Zod（入れ子表は Form ライブラリより薄い） | `@tanstack/react-form` は未使用（無駄依存回避） |
| Style | Tailwind CSS v4 + CSS tokens | |
| SoR | process-local memory | |

## Structure

```text
src/
  design-system/     # tokens + primitives
  features/accounts/
    model/           # types · readiness · filter · seed · schemas
    api/             # server + createServerFn
    ui/              # list · detail · form
  routes/            # URL only
  styles/app.css
```

## Run

```bash
cd examples/account-desk
pnpm install
pnpm dev          # http://127.0.0.1:3016
pnpm test
pnpm typecheck
pnpm test:e2e
```

### Actor stub

Cookie `account-desk-actor` / UI セレクト。

| Actor | Can |
| --- | --- |
| `alice` / `bob` | editor |
| `viewer` | 一覧・詳細のみ。edit/new は UI + API 拒否 |

### Seed ストーリー（抜粋）

| ID | 内容 |
| --- | --- |
| S-A `AOB-001` | 健全 |
| S-B `HD-UTE` | 請求は親・納品は子 + alert、bill_to 欠 |
| S-C `HGN-220` | 与信停止 + 延滞 |
| S-D | 親与信逼迫・子は独立 |
| S-E `PR-880` | prospect 不備 |
| S-G `QLT-09` | 延滞0の手動 hold |

## Non-goals

- 一括 / OCC / 非同期ジョブ / 監査 trail 本格 / root UI kit promote

## API (testing)

```text
POST /api/testing/reset
```
