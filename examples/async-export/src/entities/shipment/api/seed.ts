import type { Shipment, WarehouseId } from "../model/shipment";

const WAREHOUSES: WarehouseId[] = ["WH-A", "WH-B", "WH-C", "WH-X"];
const STATUSES = ["draft", "allocated", "shipped", "cancelled"] as const;
const ASSIGNEES = ["clerk", "manager", "admin", "alice", "bob"] as const;

/**
 * 一覧・上限超過デモ用に十分な件数を生成。
 * WH-A/B 多め、WH-C/X は権限差デモ用。
 */
export function buildSeedShipments(): Shipment[] {
  const rows: Shipment[] = [];
  let n = 0;

  for (const warehouseId of WAREHOUSES) {
    const count =
      warehouseId === "WH-A" || warehouseId === "WH-B"
        ? 18
        : warehouseId === "WH-C"
          ? 10
          : 6;

    for (let i = 0; i < count; i++) {
      n += 1;
      const day = String(((n - 1) % 28) + 1).padStart(2, "0");
      rows.push({
        id: `sh-${String(n).padStart(3, "0")}`,
        orderNo: `ORD-${1000 + n}`,
        warehouseId,
        status: STATUSES[n % STATUSES.length]!,
        assigneeId: ASSIGNEES[n % ASSIGNEES.length]!,
        sku: `SKU-${(n % 12) + 1}`,
        quantity: (n % 5) + 1,
        plannedShipDate: `2026-03-${day}`,
      });
    }
  }

  return rows;
}
