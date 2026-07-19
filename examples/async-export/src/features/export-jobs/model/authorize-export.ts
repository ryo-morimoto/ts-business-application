import type { WarehouseId } from "@/shared/catalog/warehouse";
import type { Actor } from "@/shared/actor";
import { canAccessWarehouse } from "@/shared/actor";
import type { ExportCriteria } from "./export-criteria";

export type AuthorizeExportResult =
  | { ok: true }
  | { ok: false; reason: "no_warehouse_access" | "warehouse_out_of_scope" };

/**
 * 依頼受付時の認可。
 * 閲覧できない範囲の出力依頼は拒否する（出力だけ迂回させない）。
 */
export function authorizeExportRequest(
  actor: Actor,
  criteria: ExportCriteria,
): AuthorizeExportResult {
  if (actor.warehouseIds.length === 0) {
    return { ok: false, reason: "no_warehouse_access" };
  }

  if (criteria.warehouseId) {
    if (!canAccessWarehouse(actor, criteria.warehouseId)) {
      return { ok: false, reason: "warehouse_out_of_scope" };
    }
  }

  return { ok: true };
}

/**
 * 処理実行時の再認可。
 * 受付後に権限が狭まった場合、欠けた成果物を成功として渡さない。
 */
export function authorizeExportProcessing(
  actor: Actor,
  criteria: ExportCriteria,
  matchedWarehouseIds: readonly WarehouseId[],
): AuthorizeExportResult {
  const atRequest = authorizeExportRequest(actor, criteria);
  if (!atRequest.ok) return atRequest;

  for (const wh of matchedWarehouseIds) {
    if (!canAccessWarehouse(actor, wh)) {
      return { ok: false, reason: "warehouse_out_of_scope" };
    }
  }

  return { ok: true };
}

export function authorizeMessage(
  reason: "no_warehouse_access" | "warehouse_out_of_scope",
): string {
  switch (reason) {
    case "no_warehouse_access":
      return "閲覧できる倉庫がないため、ファイル出力を依頼できません。";
    case "warehouse_out_of_scope":
      return "指定した倉庫を閲覧する権限がないため、この条件では出力を依頼できません。";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}
