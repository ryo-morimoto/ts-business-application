import {
  filterShipments,
  sortShipments,
  type Shipment,
} from "@/entities/shipment";
import type { Actor } from "@/shared/actor";
import { authorizeExportProcessing } from "./authorize-export";
import { buildShipmentCsv } from "./build-csv";
import type { ExportCriteria } from "./export-criteria";
import type { ExportFailureReason } from "./export-job";
import { failureMessage } from "./failure-message";
import { ARTIFACT_RETENTION_DAYS, EXPORT_ROW_LIMIT } from "./limits";

export type EvaluateExportSuccess = {
  ok: true;
  rows: Shipment[];
  csv: string;
  rowCount: number;
  expiresAt: string;
  fileName: string;
};

export type EvaluateExportFailure = {
  ok: false;
  reason: ExportFailureReason;
  message: string;
  matchedCount: number;
};

export type EvaluateExportResult = EvaluateExportSuccess | EvaluateExportFailure;

export type EvaluateExportInput = {
  shipments: readonly Shipment[];
  criteria: ExportCriteria;
  actor: Actor;
  jobId: string;
  now: Date;
  rowLimit?: number;
  retentionDays?: number;
};

/**
 * 非同期ジョブ本体の純粋評価。
 * 成功時のみ CSV を返し、失敗時は成果物を一切返さない（部分成功なし）。
 */
export function evaluateExport(
  input: EvaluateExportInput,
): EvaluateExportResult {
  const limit = input.rowLimit ?? EXPORT_ROW_LIMIT;
  const retentionDays = input.retentionDays ?? ARTIFACT_RETENTION_DAYS;

  const matched = sortShipments(
    filterShipments(input.shipments, input.criteria, input.actor),
  );

  const warehouses = [...new Set(matched.map((r) => r.warehouseId))];
  const authz = authorizeExportProcessing(
    input.actor,
    input.criteria,
    warehouses,
  );
  if (!authz.ok) {
    return {
      ok: false,
      reason: "unauthorized_scope",
      message: failureMessage("unauthorized_scope"),
      matchedCount: matched.length,
    };
  }

  if (
    input.criteria.warehouseId &&
    !input.actor.warehouseIds.includes(input.criteria.warehouseId)
  ) {
    return {
      ok: false,
      reason: "unauthorized_scope",
      message: failureMessage("unauthorized_scope"),
      matchedCount: matched.length,
    };
  }

  if (matched.length === 0) {
    return {
      ok: false,
      reason: "empty_result",
      message: failureMessage("empty_result"),
      matchedCount: 0,
    };
  }

  if (matched.length > limit) {
    return {
      ok: false,
      reason: "row_limit_exceeded",
      message: failureMessage("row_limit_exceeded", {
        matchedCount: matched.length,
        limit,
      }),
      matchedCount: matched.length,
    };
  }

  const csv = buildShipmentCsv(matched);
  const expires = new Date(input.now);
  expires.setUTCDate(expires.getUTCDate() + retentionDays);

  return {
    ok: true,
    rows: matched,
    csv,
    rowCount: matched.length,
    expiresAt: expires.toISOString(),
    fileName: `${input.jobId}.csv`,
  };
}

export function isArtifactExpired(
  expiresAt: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= new Date(expiresAt).getTime();
}
