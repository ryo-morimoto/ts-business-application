import type { CustomerListQuery } from "@bulk-reassign/contracts";

export type SelectionMode = "page" | "all_matching";

export type WorkbenchUrlState = {
  query: string;
  sort: CustomerListQuery["sort"];
  page: number;
  pageSize: number;
  actorId: string;
  selectionMode: SelectionMode;
};

export const defaults: WorkbenchUrlState = {
  query: "",
  sort: "name",
  page: 1,
  pageSize: 20,
  actorId: "agent-a",
  selectionMode: "page",
};

/** Parse from Next.js `useSearchParams()` (App Router). */
export function parseSearchParams(
  sp: URLSearchParams | { get(name: string): string | null },
): WorkbenchUrlState {
  const sort = sp.get("sort");
  const page = Number(sp.get("page") ?? defaults.page);
  const pageSize = Number(sp.get("pageSize") ?? defaults.pageSize);
  const selectionMode = sp.get("selectionMode");

  return {
    query: sp.get("query") ?? defaults.query,
    sort: sort === "assigneeId" ? "assigneeId" : "name",
    page: Number.isFinite(page) && page > 0 ? page : defaults.page,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaults.pageSize,
    actorId: sp.get("actor") ?? defaults.actorId,
    selectionMode: selectionMode === "all_matching" ? "all_matching" : "page",
  };
}

export function toSearchString(state: WorkbenchUrlState): string {
  const sp = new URLSearchParams();
  if (state.query) sp.set("query", state.query);
  if (state.sort !== defaults.sort) sp.set("sort", state.sort);
  if (state.page !== defaults.page) sp.set("page", String(state.page));
  if (state.pageSize !== defaults.pageSize) {
    sp.set("pageSize", String(state.pageSize));
  }
  if (state.actorId !== defaults.actorId) sp.set("actor", state.actorId);
  if (state.selectionMode !== defaults.selectionMode) {
    sp.set("selectionMode", state.selectionMode);
  }
  return sp.toString();
}

export function toListQuery(state: WorkbenchUrlState): CustomerListQuery {
  return {
    query: state.query || undefined,
    sort: state.sort,
    page: state.page,
    pageSize: state.pageSize,
  };
}
