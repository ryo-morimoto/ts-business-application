import {
  ALLOWED_ORDER_LIST_FILTERS,
  type AppError,
  type OrderListQuery,
  orderListQuerySchema,
} from "@fulfillment-desk/contracts";

const ALLOWED = new Set<string>(ALLOWED_ORDER_LIST_FILTERS);

export type ParseListFiltersResult =
  | { ok: true; query: OrderListQuery }
  | { ok: false; error: AppError };

/**
 * Expose SoR filter limits: reject unknown keys instead of silently dropping them.
 * Client-side free-text search is intentionally not layered on top.
 */
export function parseOrderListFilters(
  raw: Record<string, string | undefined>,
): ParseListFiltersResult {
  const keys = Object.keys(raw).filter((k) => raw[k] !== undefined && raw[k] !== "");
  const rejected = keys.filter((k) => !ALLOWED.has(k));
  if (rejected.length > 0) {
    return {
      ok: false,
      error: {
        error: "app_error",
        code: "unsupported_filter",
        message:
          "External OMS only accepts status and warehouseId. Free-text / customer filters are not supported.",
        allowedFilters: [...ALLOWED_ORDER_LIST_FILTERS],
        rejectedFilters: rejected,
      },
    };
  }

  const candidate: Record<string, string> = {};
  for (const key of ALLOWED_ORDER_LIST_FILTERS) {
    const v = raw[key];
    if (v !== undefined && v !== "") candidate[key] = v;
  }

  const parsed = orderListQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        error: "app_error",
        code: "invalid_body",
        message: "Invalid list filter values",
      },
    };
  }

  return { ok: true, query: parsed.data };
}
