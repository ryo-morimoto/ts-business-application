"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BulkAssignResult, SelectionScope } from "@bulk-reassign/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { apiBase, fetchCustomers, postBulkAssign } from "@/lib/api-client";
import {
  parseSearchParams,
  toListQuery,
  toSearchString,
  type WorkbenchUrlState,
} from "@/lib/url-state";
import { BulkAssignDialog } from "./bulk-assign-dialog";
import { BulkResultPanel } from "./bulk-result-panel";
import { CustomerTable } from "./customer-table";
import { SelectionBar } from "./selection-bar";

function newRequestId(): string {
  return `req-${crypto.randomUUID()}`;
}

/**
 * Same product flow as Vite `apps/web`, with App Router URL ownership:
 * `useSearchParams` + `router.replace` instead of `history.replaceState`.
 */
export function CustomersWorkbench() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const url = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams],
  );

  const [pageSelected, setPageSelected] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastResult, setLastResult] = useState<BulkAssignResult | null>(null);

  const replaceUrl = useCallback(
    (next: WorkbenchUrlState) => {
      const qs = toSearchString(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const listQuery = useMemo(() => toListQuery(url), [url]);

  const customersQuery = useQuery({
    queryKey: ["customers", url.actorId, listQuery],
    queryFn: () => fetchCustomers(listQuery, { actorId: url.actorId }),
  });

  const items = customersQuery.data?.items ?? [];
  const total = customersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / url.pageSize));

  const patchUrl = useCallback(
    (patch: Partial<WorkbenchUrlState>) => {
      const next: WorkbenchUrlState = { ...url, ...patch };
      if (
        patch.query !== undefined ||
        patch.sort !== undefined ||
        patch.pageSize !== undefined
      ) {
        next.page = patch.page ?? 1;
      }
      replaceUrl(next);
      setPageSelected(new Set());
      setExcludedIds(new Set());
      setLastResult(null);
    },
    [url, replaceUrl],
  );

  const onToggleId = useCallback(
    (id: string) => {
      if (url.selectionMode === "all_matching") {
        setExcludedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        return;
      }
      setPageSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [url.selectionMode],
  );

  const onTogglePage = useCallback((ids: string[], checked: boolean) => {
    setPageSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const bulkMutation = useMutation({
    mutationFn: async (assigneeId: string) => {
      const scope: SelectionScope =
        url.selectionMode === "page"
          ? { mode: "page", ids: [...pageSelected] }
          : {
              mode: "all_matching",
              filter: { query: url.query || undefined },
              excludedIds: [...excludedIds],
              estimatedCount: Math.max(0, total - excludedIds.size),
            };

      return postBulkAssign(
        {
          requestId: newRequestId(),
          assigneeId,
          scope,
        },
        { actorId: url.actorId },
      );
    },
    onSuccess: async (result) => {
      setLastResult(result);
      setDialogOpen(false);
      setPageSelected(new Set());
      setExcludedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const targetCount =
    url.selectionMode === "page"
      ? pageSelected.size
      : Math.max(0, total - excludedIds.size);

  return (
    <main>
      <header>
        <h1>Customers · bulk reassign</h1>
        <p className="muted">
          Next App Router shell · API <code>{apiBase}</code> · actor{" "}
          <code>{url.actorId}</code>
        </p>
        <p className="stack-note">
          <strong>N1 stack:</strong> this app does not own bulk/authz. Same Hono
          API as Vite <code>apps/web</code>. URL state via{" "}
          <code>useSearchParams</code> + <code>router.replace</code>.
        </p>
      </header>

      <div className="toolbar">
        <label className="field">
          <span>Actor (x-actor-id)</span>
          <select
            value={url.actorId}
            onChange={(e) => patchUrl({ actorId: e.target.value })}
          >
            <option value="admin">admin (all allowed)</option>
            <option value="agent-a">agent-a (c-003 denied)</option>
            <option value="agent-b">agent-b (c-002, c-005 denied)</option>
          </select>
        </label>
        <label className="field">
          <span>Filter query</span>
          <input
            value={url.query}
            placeholder="name contains…"
            onChange={(e) => patchUrl({ query: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Sort</span>
          <select
            value={url.sort}
            onChange={(e) =>
              patchUrl({
                sort: e.target.value === "assigneeId" ? "assigneeId" : "name",
              })
            }
          >
            <option value="name">name</option>
            <option value="assigneeId">assigneeId</option>
          </select>
        </label>
      </div>

      <SelectionBar
        selectionMode={url.selectionMode}
        pageSelectedCount={pageSelected.size}
        totalMatching={total}
        excludedCount={excludedIds.size}
        onModeChange={(selectionMode) => {
          replaceUrl({ ...url, selectionMode });
          setPageSelected(new Set());
          setExcludedIds(new Set());
        }}
        onClear={() => {
          setPageSelected(new Set());
          setExcludedIds(new Set());
        }}
        onOpenBulk={() => setDialogOpen(true)}
      />

      {customersQuery.isLoading ? (
        <p className="muted">Loading…</p>
      ) : customersQuery.isError ? (
        <p className="error">
          {customersQuery.error instanceof Error
            ? customersQuery.error.message
            : "Failed to load"}
        </p>
      ) : total === 0 ? (
        <p className="muted" data-testid="empty-state">
          {url.query
            ? "No results for current filter (no results)."
            : "No customers (no data)."}
        </p>
      ) : (
        <CustomerTable
          rows={items}
          selectedIds={
            url.selectionMode === "all_matching"
              ? new Set(
                  items.map((i) => i.id).filter((id) => !excludedIds.has(id)),
                )
              : pageSelected
          }
          selectionMode={url.selectionMode}
          onToggleId={onToggleId}
          onTogglePage={onTogglePage}
        />
      )}

      <div className="pager">
        <button
          type="button"
          className="secondary"
          disabled={url.page <= 1}
          onClick={() => patchUrl({ page: url.page - 1 })}
        >
          Previous
        </button>
        <span className="muted">
          Page {url.page} / {pageCount} · {total} matching
        </span>
        <button
          type="button"
          className="secondary"
          disabled={url.page >= pageCount}
          onClick={() => patchUrl({ page: url.page + 1 })}
        >
          Next
        </button>
      </div>

      <BulkResultPanel result={lastResult} />
      {bulkMutation.isError ? (
        <p className="error">
          {bulkMutation.error instanceof Error
            ? bulkMutation.error.message
            : "Bulk failed"}
        </p>
      ) : null}

      <BulkAssignDialog
        open={dialogOpen}
        selectionMode={url.selectionMode}
        targetCount={targetCount}
        pageIds={[...pageSelected]}
        submitting={bulkMutation.isPending}
        onClose={() => setDialogOpen(false)}
        onSubmit={(assigneeId) => bulkMutation.mutate(assigneeId)}
      />
    </main>
  );
}
