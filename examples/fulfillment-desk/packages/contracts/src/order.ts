import { z } from "zod";
import { compositionProvenanceSchema } from "./provenance";

/** App-facing order statuses (camelCase contracts). External OMS uses snake_case. */
export const orderStatusSchema = z.enum([
  "ready_to_ship",
  "shipped",
  "cancelled",
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

/**
 * Filters the external OMS actually supports.
 * Free-text / customer-name search is intentionally unsupported.
 */
export const ALLOWED_ORDER_LIST_FILTERS = ["status", "warehouseId"] as const;

export type AllowedOrderListFilter = (typeof ALLOWED_ORDER_LIST_FILTERS)[number];

export const orderListQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  warehouseId: z.string().min(1).optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const orderSummarySchema = z.object({
  id: z.string().min(1),
  status: orderStatusSchema,
  warehouseId: z.string().min(1),
  customerId: z.string().min(1),
  lineCount: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
});

export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const orderLineSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  availableQty: z.number().int().nonnegative(),
  shortfall: z.number().int().nonnegative(),
});

export type OrderLine = z.infer<typeof orderLineSchema>;

export const customerSnippetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shipCity: z.string().min(1),
});

export type CustomerSnippet = z.infer<typeof customerSnippetSchema>;

export const orderDetailSchema = orderSummarySchema.extend({
  customer: customerSnippetSchema,
  lines: z.array(orderLineSchema),
  canShipByStock: z.boolean(),
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

/** Detail envelope: app data + how the BFF built it. */
export const orderDetailResponseSchema = z.object({
  order: orderDetailSchema,
  provenance: compositionProvenanceSchema,
});

export type OrderDetailResponse = z.infer<typeof orderDetailResponseSchema>;

export const orderListResponseSchema = z.object({
  items: z.array(orderSummarySchema),
  meta: z.object({
    allowedFilters: z.array(z.enum(ALLOWED_ORDER_LIST_FILTERS)),
    applied: orderListQuerySchema,
  }),
  provenance: compositionProvenanceSchema,
});

export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

export const shipBodySchema = z.object({
  carrierCode: z.string().min(1),
});

export type ShipBody = z.infer<typeof shipBodySchema>;

export const shipResultSchema = z.object({
  order: orderDetailSchema,
  trackingNumber: z.string().min(1),
  provenance: compositionProvenanceSchema,
});

export type ShipResult = z.infer<typeof shipResultSchema>;
