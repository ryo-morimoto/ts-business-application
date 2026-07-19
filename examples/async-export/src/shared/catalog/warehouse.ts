import { z } from "zod";

/** 横断マスタ: 倉庫 ID（actor 権限と出荷明細の両方で使う） */
export const warehouseIdSchema = z.enum(["WH-A", "WH-B", "WH-C", "WH-X"]);

export type WarehouseId = z.infer<typeof warehouseIdSchema>;
