import { z } from "zod";
import {
  warehouseIdSchema,
  type WarehouseId,
} from "@/shared/catalog/warehouse";

export { warehouseIdSchema, type WarehouseId };

/** 出荷明細の業務状態 */
export const shipmentStatusSchema = z.enum([
  "draft",
  "allocated",
  "shipped",
  "cancelled",
]);

export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;

export const shipmentSchema = z.object({
  id: z.string().min(1),
  orderNo: z.string().min(1),
  warehouseId: warehouseIdSchema,
  status: shipmentStatusSchema,
  assigneeId: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  /** 出荷予定日 (date-only ISO: YYYY-MM-DD) */
  plannedShipDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Shipment = z.infer<typeof shipmentSchema>;
