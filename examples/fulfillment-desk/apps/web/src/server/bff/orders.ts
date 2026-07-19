import type {
  AppError,
  OrderDetailResponse,
  OrderListQuery,
  OrderListResponse,
  ShipResult,
} from "@fulfillment-desk/contracts";
import {
  asCompositionFailure,
  canShip,
  composeOrderDetail,
  mapExternalError,
  newCorrelationId,
  ProvenanceCollector,
  toOrderSummary,
  type Actor,
} from "@fulfillment-desk/domain";
import {
  createDefaultPorts,
  type ExternalPorts,
} from "@/server/external";

export type BffResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export type OrderBff = {
  listOrders: (query: OrderListQuery) => Promise<BffResult<OrderListResponse>>;
  getOrderDetail: (orderId: string) => Promise<BffResult<OrderDetailResponse>>;
  shipOrder: (
    orderId: string,
    carrierCode: string,
    actor: Actor,
  ) => Promise<BffResult<ShipResult>>;
};

export type CreateOrderBffOptions = {
  ports?: ExternalPorts;
  /** Soft budget per outbound SoR call (ms). */
  callBudgetMs?: number;
  correlationId?: string;
  now?: () => number;
};

async function timedCall<T>(
  provenance: ProvenanceCollector,
  system: "oms" | "customer" | "inventory",
  operation: string,
  run: () => Promise<{ ok: true; data: T } | { ok: false; error: import("@fulfillment-desk/domain").ForeignError }>,
  now: () => number,
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: AppError }
> {
  const started = now();
  const result = await run();
  const durationMs = Math.max(0, now() - started);
  provenance.record({
    system,
    operation,
    ok: result.ok,
    durationMs,
  });
  if (!result.ok) {
    const mapped = mapExternalError(result.error, {
      correlationId: provenance.correlationId,
      failedSystem: system,
      failedOperation: operation,
    });
    return { ok: false, error: mapped };
  }
  return { ok: true, data: result.data };
}

/**
 * BFF orchestration. Depends on ports (not concrete mocks) so composition
 * policy stays testable and SoR implementations stay swappable.
 */
export function createOrderBff(options: CreateOrderBffOptions = {}): OrderBff {
  const ports = options.ports ?? createDefaultPorts();
  const callBudgetMs = options.callBudgetMs;
  const now = options.now ?? (() => Date.now());

  function freshProvenance() {
    return new ProvenanceCollector(
      options.correlationId ?? newCorrelationId(),
      now,
    );
  }

  const callOpts = callBudgetMs !== undefined ? { budgetMs: callBudgetMs } : {};

  async function listOrders(
    query: OrderListQuery,
  ): Promise<BffResult<OrderListResponse>> {
    const provenance = freshProvenance();
    const foreign = await timedCall(
      provenance,
      "oms",
      "list_orders",
      () =>
        ports.oms.listOrders(
          {
            status: query.status,
            warehouse_id: query.warehouseId,
          },
          callOpts,
        ),
      now,
    );
    if (!foreign.ok) {
      return {
        ok: false,
        error: { ...foreign.error, correlationId: provenance.correlationId },
      };
    }
    return {
      ok: true,
      data: {
        items: foreign.data.map(toOrderSummary),
        meta: {
          allowedFilters: ["status", "warehouseId"],
          applied: query,
        },
        provenance: provenance.freeze(),
      },
    };
  }

  /**
   * Composite read: OMS order + customer + per-line inventory.
   * UI calls one BFF endpoint; N+1 against external SoRs stays server-side.
   * Failures mid-pipeline become composition_failed (no partial invented data).
   */
  async function getOrderDetail(
    orderId: string,
  ): Promise<BffResult<OrderDetailResponse>> {
    const provenance = freshProvenance();

    const orderRes = await timedCall(
      provenance,
      "oms",
      "get_order",
      () => ports.oms.getOrder(orderId, callOpts),
      now,
    );
    if (!orderRes.ok) {
      return { ok: false, error: orderRes.error };
    }
    const order = orderRes.data;

    const customerRes = await timedCall(
      provenance,
      "customer",
      "get",
      () => ports.customer.get(order.customer_id, callOpts),
      now,
    );
    if (!customerRes.ok) {
      return {
        ok: false,
        error: asCompositionFailure(
          customerRes.error,
          "customer",
          "get",
        ),
      };
    }

    const invRes = await timedCall(
      provenance,
      "inventory",
      "get_many",
      () =>
        ports.inventory.getMany(
          order.line_items.map((li) => ({
            sku: li.sku,
            warehouse_id: order.warehouse_id,
          })),
          callOpts,
        ),
      now,
    );
    if (!invRes.ok) {
      return {
        ok: false,
        error: asCompositionFailure(invRes.error, "inventory", "get_many"),
      };
    }

    return {
      ok: true,
      data: {
        order: composeOrderDetail(order, customerRes.data, invRes.data),
        provenance: provenance.freeze(),
      },
    };
  }

  async function shipOrder(
    orderId: string,
    carrierCode: string,
    actor: Actor,
  ): Promise<BffResult<ShipResult>> {
    const provenance = freshProvenance();

    if (!canShip(actor)) {
      return {
        ok: false,
        error: {
          error: "app_error",
          code: "missing_permission",
          message: "Actor cannot ship orders",
          correlationId: provenance.correlationId,
        },
      };
    }

    const shipRes = await timedCall(
      provenance,
      "oms",
      "ship_order",
      () =>
        ports.oms.shipOrder(
          { order_id: orderId, carrier_code: carrierCode },
          callOpts,
        ),
      now,
    );
    if (!shipRes.ok) {
      return { ok: false, error: shipRes.error };
    }

    // Re-compose detail after SoR mutation (customer + residual inventory).
    // Nested provenance is folded into the same collector via sequential calls.
    const orderRes = await timedCall(
      provenance,
      "oms",
      "get_order",
      () => ports.oms.getOrder(orderId, callOpts),
      now,
    );
    if (!orderRes.ok) {
      return {
        ok: false,
        error: asCompositionFailure(orderRes.error, "oms", "get_order"),
      };
    }
    const order = orderRes.data;

    const customerRes = await timedCall(
      provenance,
      "customer",
      "get",
      () => ports.customer.get(order.customer_id, callOpts),
      now,
    );
    if (!customerRes.ok) {
      return {
        ok: false,
        error: asCompositionFailure(customerRes.error, "customer", "get"),
      };
    }

    const invRes = await timedCall(
      provenance,
      "inventory",
      "get_many",
      () =>
        ports.inventory.getMany(
          order.line_items.map((li) => ({
            sku: li.sku,
            warehouse_id: order.warehouse_id,
          })),
          callOpts,
        ),
      now,
    );
    if (!invRes.ok) {
      return {
        ok: false,
        error: asCompositionFailure(invRes.error, "inventory", "get_many"),
      };
    }

    return {
      ok: true,
      data: {
        order: composeOrderDetail(order, customerRes.data, invRes.data),
        trackingNumber: shipRes.data.tracking_number,
        provenance: provenance.freeze(),
      },
    };
  }

  return { listOrders, getOrderDetail, shipOrder };
}

/** Process-default BFF (Route Handlers). */
const defaultBff = createOrderBff();

export const listOrders = (query: OrderListQuery) => defaultBff.listOrders(query);
export const getOrderDetail = (orderId: string) =>
  defaultBff.getOrderDetail(orderId);
export const shipOrder = (
  orderId: string,
  carrierCode: string,
  actor: Actor,
) => defaultBff.shipOrder(orderId, carrierCode, actor);
