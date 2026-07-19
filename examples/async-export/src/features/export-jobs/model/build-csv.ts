import type { Shipment } from "@/entities/shipment";

const HEADER = [
  "id",
  "orderNo",
  "warehouseId",
  "status",
  "assigneeId",
  "sku",
  "quantity",
  "plannedShipDate",
] as const;

function escapeCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

/**
 * 取り決めた列セットの CSV。BOM なし UTF-8。
 */
export function buildShipmentCsv(rows: readonly Shipment[]): string {
  const lines = [HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.orderNo,
        row.warehouseId,
        row.status,
        row.assigneeId,
        row.sku,
        row.quantity,
        row.plannedShipDate,
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}
