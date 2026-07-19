import { z } from "zod";
import { exportCriteriaSchema } from "./export-criteria";

/**
 * 利用者が理解できる進捗語。
 * accepted = 受付済み / running = 処理中 / completed = 完了 / failed = 失敗
 */
export const exportJobStatusSchema = z.enum([
  "accepted",
  "running",
  "completed",
  "failed",
]);

export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;

/**
 * 失敗理由コード（機械可読）。画面には業務語メッセージを併せて出す。
 * 部分成功のファイル配布はしない — 失敗は常に成果物なし。
 */
export const exportFailureReasonSchema = z.enum([
  "empty_result",
  "row_limit_exceeded",
  "unauthorized_scope",
  "processing_timeout",
  "system_interrupted",
]);

export type ExportFailureReason = z.infer<typeof exportFailureReasonSchema>;

export const exportArtifactSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.literal("text/csv; charset=utf-8"),
  rowCount: z.number().int().nonnegative(),
  expiresAt: z.string().min(1),
  byteLength: z.number().int().nonnegative(),
});

export type ExportArtifact = z.infer<typeof exportArtifactSchema>;

export const exportJobSchema = z.object({
  id: z.string().min(1),
  criteria: exportCriteriaSchema,
  status: exportJobStatusSchema,
  requestedBy: z.string().min(1),
  requestedAt: z.string().min(1),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  failureReason: exportFailureReasonSchema.nullable(),
  failureMessage: z.string().nullable(),
  estimatedRowCount: z.number().int().nonnegative().nullable(),
  artifact: exportArtifactSchema.nullable(),
});

export type ExportJob = z.infer<typeof exportJobSchema>;
