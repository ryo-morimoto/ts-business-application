import {
  bulkAssignResultSchema,
  customerListResponseSchema,
  type BulkAssignRequest,
  type BulkAssignResult,
  type CustomerListQuery,
  type CustomerListResponse,
} from "@bulk-reassign/contracts";

/** Browser-facing API base (N1: external Hono, not Next Route Handlers). */
export const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8788";

export type ApiClientOptions = {
  actorId: string;
};

function headers(actorId: string, json = false): Headers {
  const h = new Headers();
  h.set("x-actor-id", actorId);
  if (json) h.set("Content-Type", "application/json");
  return h;
}

export async function fetchCustomers(
  query: CustomerListQuery,
  opts: ApiClientOptions,
): Promise<CustomerListResponse> {
  const params = new URLSearchParams();
  if (query.query) params.set("query", query.query);
  if (query.assigneeId !== undefined && query.assigneeId !== null) {
    params.set("assigneeId", query.assigneeId);
  }
  params.set("sort", query.sort);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  const res = await fetch(`${apiBase}/customers?${params}`, {
    headers: headers(opts.actorId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`list failed: HTTP ${res.status}`);
  return customerListResponseSchema.parse(await res.json());
}

export async function postBulkAssign(
  request: BulkAssignRequest,
  opts: ApiClientOptions,
): Promise<BulkAssignResult> {
  const res = await fetch(`${apiBase}/bulk-assign`, {
    method: "POST",
    headers: headers(opts.actorId, true),
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`bulk-assign failed: HTTP ${res.status}`);
  return bulkAssignResultSchema.parse(await res.json());
}
