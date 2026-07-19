/**
 * Foreign OMS mock — System of Record.
 *
 * Intentionally "foreign":
 * - snake_case fields
 * - limited list filters (status, warehouse_id only)
 * - foreign error envelope { err_code, err_msg, details, retry_after_sec }
 *
 * Not the app store. BFF translates; domain composes.
 */

import type { OrderStatus } from "@fulfillment-desk/contracts";
import type { ForeignAvailability, ForeignOrder } from "@fulfillment-desk/domain";
import { runForeignCall } from "./call";
import { SEED_INVENTORY, SEED_ORDERS } from "./seed";
import type { ExternalCallOptions, ExternalResult } from "./types";

type OmsState = {
  orders: ForeignOrder[];
  inventory: ForeignAvailability[];
  trackingSeq: number;
};

const G = globalThis as typeof globalThis & {
  __fulfillmentDeskOms?: OmsState;
};

function state(): OmsState {
  if (!G.__fulfillmentDeskOms) {
    G.__fulfillmentDeskOms = {
      orders: structuredClone(SEED_ORDERS),
      inventory: structuredClone(SEED_INVENTORY),
      trackingSeq: 1000,
    };
  }
  return G.__fulfillmentDeskOms;
}

export type OmsListParams = {
  status?: OrderStatus;
  warehouse_id?: string;
  [key: string]: string | undefined;
};

const OMS_ALLOWED_FILTERS = new Set(["status", "warehouse_id"]);

export type OmsShipInput = {
  order_id: string;
  carrier_code: string;
};

export type OmsShipData = {
  order: ForeignOrder;
  tracking_number: string;
};

export async function omsListOrders(
  params: OmsListParams = {},
  opts?: ExternalCallOptions,
): Promise<ExternalResult<ForeignOrder[]>> {
  return runForeignCall(opts, () => {
    const keys = Object.keys(params).filter(
      (k) => params[k] !== undefined && params[k] !== "",
    );
    const rejected = keys.filter((k) => !OMS_ALLOWED_FILTERS.has(k));
    if (rejected.length > 0) {
      return {
        ok: false,
        error: {
          err_code: "validation_error",
          err_msg: `Unsupported query params: ${rejected.join(", ")}`,
          details: { rejected, allowed: [...OMS_ALLOWED_FILTERS] },
        },
      };
    }

    let rows = [...state().orders];
    if (params.status) {
      rows = rows.filter((o) => o.status === params.status);
    }
    if (params.warehouse_id) {
      rows = rows.filter((o) => o.warehouse_id === params.warehouse_id);
    }
    rows.sort((a, b) => a.order_id.localeCompare(b.order_id));
    return { ok: true, data: rows };
  });
}

export async function omsGetOrder(
  orderId: string,
  opts?: ExternalCallOptions,
): Promise<ExternalResult<ForeignOrder>> {
  return runForeignCall(opts, () => {
    const row = state().orders.find((o) => o.order_id === orderId);
    if (!row) {
      return {
        ok: false,
        error: { err_code: "not_found", err_msg: `order ${orderId} not found` },
      };
    }
    return { ok: true, data: structuredClone(row) };
  });
}

/**
 * Carrier codes that force foreign failure modes (for demos / tests):
 * - SIMULATE_RATE_LIMIT → rate_limited + retry_after_sec
 * - SIMULATE_TIMEOUT → work latency > budget (real timeout path)
 *   (if no budget, returns timeout error directly)
 */
export async function omsShipOrder(
  input: OmsShipInput,
  opts?: ExternalCallOptions,
): Promise<ExternalResult<OmsShipData>> {
  if (input.carrier_code === "SIMULATE_TIMEOUT") {
    const budget = opts?.budgetMs ?? 20;
    return runForeignCall(
      { ...opts, latencyMs: (opts?.latencyMs ?? 0) + budget + 30, budgetMs: budget },
      () => ({
        ok: true,
        data: {
          order: state().orders[0]!,
          tracking_number: "SHOULD_NOT_REACH",
        },
      }),
    );
  }

  return runForeignCall(opts, () => {
    if (input.carrier_code === "SIMULATE_RATE_LIMIT") {
      return {
        ok: false,
        error: {
          err_code: "rate_limited",
          err_msg: "OMS rate limit exceeded",
          retry_after_sec: 30,
          details: { retry_after_sec: 30 },
        },
      };
    }
    if (!input.carrier_code.trim()) {
      return {
        ok: false,
        error: {
          err_code: "validation_error",
          err_msg: "carrier_code required",
        },
      };
    }

    const s = state();
    const idx = s.orders.findIndex((o) => o.order_id === input.order_id);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          err_code: "not_found",
          err_msg: `order ${input.order_id} not found`,
        },
      };
    }

    const current = s.orders[idx]!;
    if (current.status !== "ready_to_ship") {
      return {
        ok: false,
        error: {
          err_code: "invalid_state",
          err_msg: `cannot ship order in status ${current.status}`,
        },
      };
    }

    const shortages: Array<{
      sku: string;
      requested: number;
      available: number;
    }> = [];

    for (const line of current.line_items) {
      const inv = s.inventory.find(
        (i) =>
          i.sku === line.sku && i.warehouse_id === current.warehouse_id,
      );
      const available = inv?.available_qty ?? 0;
      if (available < line.qty) {
        shortages.push({
          sku: line.sku,
          requested: line.qty,
          available,
        });
      }
    }

    if (shortages.length > 0) {
      return {
        ok: false,
        error: {
          err_code: "inventory_shortage",
          err_msg: "insufficient inventory for one or more lines",
          details: { shortages },
        },
      };
    }

    for (const line of current.line_items) {
      const inv = s.inventory.find(
        (i) =>
          i.sku === line.sku && i.warehouse_id === current.warehouse_id,
      );
      if (inv) inv.available_qty -= line.qty;
    }

    const now = new Date().toISOString();
    const next: ForeignOrder = {
      ...current,
      status: "shipped",
      updated_at: now,
    };
    s.orders[idx] = next;
    s.trackingSeq += 1;

    return {
      ok: true,
      data: {
        order: structuredClone(next),
        tracking_number: `TRK-${s.trackingSeq}`,
      },
    };
  });
}

export function omsReset(): void {
  G.__fulfillmentDeskOms = {
    orders: structuredClone(SEED_ORDERS),
    inventory: structuredClone(SEED_INVENTORY),
    trackingSeq: 1000,
  };
}

export function omsListInventory() {
  return structuredClone(state().inventory);
}
