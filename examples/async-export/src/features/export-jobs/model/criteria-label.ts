import type { ExportCriteria } from "./export-criteria";

/** 依頼条件の人間向け要約（受付固定スナップショット表示） */
export function criteriaLabel(criteria: ExportCriteria): string {
  const parts: string[] = [];
  if (criteria.warehouseId) parts.push(`倉庫=${criteria.warehouseId}`);
  if (criteria.status) parts.push(`状態=${criteria.status}`);
  if (criteria.assigneeId) parts.push(`担当=${criteria.assigneeId}`);
  if (criteria.plannedShipDateFrom || criteria.plannedShipDateTo) {
    parts.push(
      `予定日=${criteria.plannedShipDateFrom ?? "…"}〜${criteria.plannedShipDateTo ?? "…"}`,
    );
  }
  return parts.length > 0 ? parts.join(" / ") : "条件なし（権限内の全件）";
}
