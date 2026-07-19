import type { Actor } from "@/shared/actor";
import { canAccessWarehouse } from "@/shared/actor";
import type { Shipment } from "./shipment";

/** 一覧・出力共通の絞り込み条件（export-jobs からも同じ形で渡す） */
export type ShipmentCriteria = {
  warehouseId?: Shipment["warehouseId"];
  status?: Shipment["status"];
  assigneeId?: string;
  plannedShipDateFrom?: string;
  plannedShipDateTo?: string;
};

/**
 * 一覧表示と出力対象の共通フィルタ。
 * 認可境界: actor が閲覧できない倉庫の行は常に除外する。
 */
export function filterShipments(
  shipments: readonly Shipment[],
  criteria: ShipmentCriteria,
  actor: Actor,
): Shipment[] {
  return shipments.filter((row) => {
    if (!canAccessWarehouse(actor, row.warehouseId)) return false;
    if (criteria.warehouseId && row.warehouseId !== criteria.warehouseId) {
      return false;
    }
    if (criteria.status && row.status !== criteria.status) return false;
    if (criteria.assigneeId && row.assigneeId !== criteria.assigneeId) {
      return false;
    }
    if (
      criteria.plannedShipDateFrom &&
      row.plannedShipDate < criteria.plannedShipDateFrom
    ) {
      return false;
    }
    if (
      criteria.plannedShipDateTo &&
      row.plannedShipDate > criteria.plannedShipDateTo
    ) {
      return false;
    }
    return true;
  });
}

/** 安定ソート: 予定日 → id */
export function sortShipments(rows: readonly Shipment[]): Shipment[] {
  return [...rows].sort((a, b) => {
    const byDate = a.plannedShipDate.localeCompare(b.plannedShipDate);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}
