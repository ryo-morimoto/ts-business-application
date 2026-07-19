import { z } from "zod";
import {
  shipmentStatusSchema,
  warehouseIdSchema,
} from "@/entities/shipment";

/**
 * 出力依頼時に固定される条件。
 * 受付後に書き換えられない（別依頼になる）。
 */
export const exportCriteriaSchema = z.object({
  warehouseId: warehouseIdSchema.optional(),
  status: shipmentStatusSchema.optional(),
  assigneeId: z.string().min(1).optional(),
  plannedShipDateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  plannedShipDateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type ExportCriteria = z.infer<typeof exportCriteriaSchema>;

export const createExportJobBodySchema = z.object({
  criteria: exportCriteriaSchema,
});

export type CreateExportJobBody = z.infer<typeof createExportJobBodySchema>;
