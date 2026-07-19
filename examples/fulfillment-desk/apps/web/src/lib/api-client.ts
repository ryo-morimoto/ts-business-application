import type {
  AppError,
  CompositionProvenance,
  OrderDetail,
  OrderListQuery,
  OrderSummary,
  ShipResult,
} from "@fulfillment-desk/contracts";

export type ClientOpts = { actorId: string };

function headers(actorId: string, jsonBody = false): Headers {
  const h = new Headers();
  h.set("x-actor-id", actorId);
  if (jsonBody) h.set("Content-Type", "application/json");
  return h;
}

export type OrderListMeta = {
  allowedFilters: string[];
  applied: OrderListQuery;
};

export type ListOrdersResult =
  | {
      ok: true;
      items: OrderSummary[];
      meta: OrderListMeta;
      provenance: CompositionProvenance;
    }
  | { ok: false; status: number; error: AppError };

export async function fetchOrders(
  query: OrderListQuery,
  opts: ClientOpts,
): Promise<ListOrdersResult> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.warehouseId) params.set("warehouseId", query.warehouseId);

  const res = await fetch(`/api/orders?${params.toString()}`, {
    headers: headers(opts.actorId),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, error: data as AppError };
  }
  return {
    ok: true,
    items: data.items as OrderSummary[],
    meta: data.meta as OrderListMeta,
    provenance: data.provenance as CompositionProvenance,
  };
}

/** Probe unsupported filters (demo / e2e). */
export async function fetchOrdersWithRawQuery(
  rawQuery: string,
  opts: ClientOpts,
): Promise<ListOrdersResult> {
  const res = await fetch(`/api/orders?${rawQuery}`, {
    headers: headers(opts.actorId),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, error: data as AppError };
  }
  return {
    ok: true,
    items: data.items as OrderSummary[],
    meta: data.meta,
    provenance: data.provenance,
  };
}

export type GetOrderResult =
  | {
      ok: true;
      order: OrderDetail;
      provenance: CompositionProvenance;
    }
  | { ok: false; status: number; error: AppError };

export async function fetchOrder(
  id: string,
  opts: ClientOpts,
): Promise<GetOrderResult> {
  const res = await fetch(`/api/orders/${id}`, {
    headers: headers(opts.actorId),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, error: data as AppError };
  }
  return {
    ok: true,
    order: data.order as OrderDetail,
    provenance: data.provenance as CompositionProvenance,
  };
}

export type ShipOrderResult =
  | { ok: true; result: ShipResult }
  | { ok: false; status: number; error: AppError };

export async function postShip(
  id: string,
  carrierCode: string,
  opts: ClientOpts,
): Promise<ShipOrderResult> {
  const res = await fetch(`/api/orders/${id}/ship`, {
    method: "POST",
    headers: headers(opts.actorId, true),
    body: JSON.stringify({ carrierCode }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, error: data as AppError };
  }
  return { ok: true, result: data as ShipResult };
}

export function formatAppError(error: AppError): string {
  const parts = [error.code, error.message];
  if (error.rejectedFilters?.length) {
    parts.push(`rejected=[${error.rejectedFilters.join(",")}]`);
  }
  if (error.shortages?.length) {
    parts.push(
      error.shortages
        .map((s) => `${s.sku}: need ${s.requested}, have ${s.available}`)
        .join("; "),
    );
  }
  if (error.retryAfterSec) {
    parts.push(`retryAfter=${error.retryAfterSec}s`);
  }
  if (error.failedSystem) {
    parts.push(`step=${error.failedSystem}.${error.failedOperation ?? "?"}`);
  }
  if (error.externalCode) {
    parts.push(`ext=${error.externalCode}`);
  }
  if (error.correlationId) {
    parts.push(`corr=${error.correlationId}`);
  }
  return parts.join(" · ");
}
