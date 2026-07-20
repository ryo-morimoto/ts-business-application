import { Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import {
  Button,
  EmptyState,
  PageHeader,
  StatusChip,
  Toolbar,
} from "~/design-system";
import { accountsListQuery } from "../api/accounts.queries";
import {
  defaultAccountsSearch,
  type AccountsSearch,
} from "../model/list-search";
import { OWNERS, type ListQuery, type AccountListItem } from "../model/types";
import { formatDate, formatYen, TradingStateCluster } from "./trading-state";
import { useActor } from "~/shared/actor/actor-context";

const col = createColumnHelper<AccountListItem>();

function buildColumns(listSearch: AccountsSearch) {
  return [
    col.accessor("displayName", {
      header: "取引先",
      cell: (ctx) => {
        const row = ctx.row.original;
        return (
          <div>
            <div className="ds-truncate font-semibold" title={row.account.legalName}>
              {row.displayName}
            </div>
            <div className="text-xs text-desk-muted">{row.account.code}</div>
          </div>
        );
      },
    }),
    col.display({
      id: "trading",
      header: "商況",
      cell: (ctx) => <TradingStateCluster account={ctx.row.original.account} />,
    }),
    col.display({
      id: "ready",
      header: "完備",
      cell: (ctx) => {
        const r = ctx.row.original.readiness;
        return r.ready ? (
          <StatusChip label="完備" tone="success" />
        ) : (
          <StatusChip label={`不備${r.issues.length}`} tone="warning" />
        );
      },
    }),
    col.accessor("parentTradeName", {
      header: "親",
      cell: (ctx) => ctx.getValue() ?? "—",
    }),
    col.accessor("ownerLabel", { header: "担当" }),
    col.display({
      id: "credit",
      header: "与信限度",
      cell: (ctx) =>
        formatYen(
          ctx.row.original.account.creditLimit,
          ctx.row.original.account.currency,
        ),
    }),
    col.display({
      id: "overdue",
      header: "延滞",
      cell: (ctx) => {
        const n = ctx.row.original.ops.overdueInvoiceCount;
        if (!n) return "—";
        return (
          <span className="text-desk-danger">
            {n}件 /{" "}
            {formatYen(
              ctx.row.original.ops.overdueAmount,
              ctx.row.original.account.currency,
            )}
          </span>
        );
      },
    }),
    col.display({
      id: "updated",
      header: "更新",
      cell: (ctx) => formatDate(ctx.row.original.account.updatedAt),
    }),
    col.display({
      id: "open",
      header: "",
      cell: (ctx) => (
        <Link
          to="/accounts/$accountId"
          params={{ accountId: ctx.row.original.account.id }}
          search={listSearch}
          className="text-sm font-semibold underline"
          onClick={(e) => e.stopPropagation()}
        >
          開く
        </Link>
      ),
    }),
  ];
}

export function AccountList({ query }: { query: ListQuery }) {
  const { actor } = useActor();
  const navigate = useNavigate({ from: "/accounts/" });
  const { data } = useSuspenseQuery(accountsListQuery(query));

  const listSearch: AccountsSearch = useMemo(
    () => ({
      q: query.q ?? "",
      status: query.status ?? "",
      ownerId: query.ownerId ?? "",
      segment: query.segment ?? "",
      incomplete: query.incomplete ? "1" : "",
      creditHold: query.creditHold ? "1" : "",
      sort: query.sort ?? "updatedAt",
      page: String(query.page ?? 1),
    }),
    [query],
  );

  const columns = useMemo(() => buildColumns(listSearch), [listSearch]);
  const table = useReactTable({
    data: data.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function patchSearch(patch: Partial<AccountsSearch>) {
    const resetsPage =
      patch.q !== undefined ||
      patch.status !== undefined ||
      patch.ownerId !== undefined ||
      patch.segment !== undefined ||
      patch.incomplete !== undefined ||
      patch.creditHold !== undefined;
    const next: AccountsSearch = {
      ...listSearch,
      ...patch,
      page: patch.page ?? (resetsPage ? "1" : listSearch.page),
    };
    // Stay on list route; only replace search (URL is source of truth).
    void navigate({
      from: "/accounts/",
      search: next,
      replace: true,
    });
  }

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="取引先オペレーション"
        title="取引先一覧"
        description="比較は表で行う。装飾 KPI カードは置かない。"
        actions={
          actor.role === "editor" ? (
            <Button
              variant="primary"
              onClick={() =>
                void navigate({
                  to: "/accounts/new",
                  search: listSearch,
                })
              }
            >
              新規登録
            </Button>
          ) : null
        }
      />

      <Toolbar
        trailing={
          <p className="text-xs text-desk-muted" data-testid="result-count">
            {data.emptyKind === "data"
              ? `${data.total} 件中 ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} 件`
              : data.emptyKind === "zero"
                ? "0 件（条件一致なし）"
                : "0 件（データなし）"}
          </p>
        }
      >
        <label className="flex flex-col gap-1 text-xs font-semibold">
          検索
          <input
            className="border border-desk-border bg-desk-surface px-2 py-1.5 text-sm font-normal"
            defaultValue={query.q ?? ""}
            placeholder="コード・名称"
            data-testid="filter-q"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                patchSearch({ q: (e.target as HTMLInputElement).value });
              }
            }}
            onBlur={(e) => patchSearch({ q: e.target.value })}
            aria-label="取引先検索"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          状態
          <select
            className="border border-desk-border bg-desk-surface px-2 py-1.5 text-sm font-normal"
            value={query.status ?? ""}
            onChange={(e) => patchSearch({ status: e.target.value })}
          >
            <option value="">すべて</option>
            <option value="prospect">見込</option>
            <option value="active">稼働</option>
            <option value="suspended">停止</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          担当
          <select
            className="border border-desk-border bg-desk-surface px-2 py-1.5 text-sm font-normal"
            value={query.ownerId ?? ""}
            onChange={(e) => patchSearch({ ownerId: e.target.value })}
          >
            <option value="">すべて</option>
            {Object.entries(OWNERS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          セグメント
          <select
            className="border border-desk-border bg-desk-surface px-2 py-1.5 text-sm font-normal"
            value={query.segment ?? ""}
            onChange={(e) => patchSearch({ segment: e.target.value })}
          >
            <option value="">すべて</option>
            <option value="enterprise">enterprise</option>
            <option value="mid">mid</option>
            <option value="smb">smb</option>
            <option value="public">public</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs font-semibold">
          <input
            type="checkbox"
            data-testid="filter-incomplete"
            checked={Boolean(query.incomplete)}
            onChange={(e) =>
              patchSearch({ incomplete: e.target.checked ? "1" : "" })
            }
          />
          不備のみ
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs font-semibold">
          <input
            type="checkbox"
            data-testid="filter-credit-hold"
            checked={Boolean(query.creditHold)}
            onChange={(e) =>
              patchSearch({ creditHold: e.target.checked ? "1" : "" })
            }
          />
          与信停止のみ
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          並び
          <select
            className="border border-desk-border bg-desk-surface px-2 py-1.5 text-sm font-normal"
            value={query.sort ?? "updatedAt"}
            onChange={(e) => patchSearch({ sort: e.target.value })}
          >
            <option value="updatedAt">更新日</option>
            <option value="name">名称</option>
            <option value="code">コード</option>
          </select>
        </label>
      </Toolbar>

      {data.emptyKind === "empty" ? (
        <EmptyState
          kind="empty"
          action={
            actor.role === "editor" ? (
              <Button
                variant="primary"
                onClick={() =>
                  void navigate({
                    to: "/accounts/new",
                    search: listSearch,
                  })
                }
              >
                新規登録
              </Button>
            ) : undefined
          }
        />
      ) : data.emptyKind === "zero" ? (
        <EmptyState
          kind="zero"
          action={
            <Button
              variant="secondary"
              onClick={() =>
                void navigate({
                  to: "/accounts",
                  search: defaultAccountsSearch,
                })
              }
            >
              条件を解除
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="ds-table" data-testid="account-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id}>
                        {flexRender(
                          h.column.columnDef.header,
                          h.getContext(),
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-clickable="true"
                    tabIndex={0}
                    onClick={() =>
                      void navigate({
                        to: "/accounts/$accountId",
                        params: { accountId: row.original.account.id },
                        search: listSearch,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void navigate({
                          to: "/accounts/$accountId",
                          params: { accountId: row.original.account.id },
                          search: listSearch,
                        });
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <Button
              variant="secondary"
              disabled={data.page <= 1}
              onClick={() =>
                patchSearch({ page: String(Math.max(1, data.page - 1)) })
              }
            >
              前へ
            </Button>
            <span className="text-xs text-desk-muted">
              ページ {data.page} /{" "}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <Button
              variant="secondary"
              disabled={data.page * data.pageSize >= data.total}
              onClick={() => patchSearch({ page: String(data.page + 1) })}
            >
              次へ
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
