import { listVisibleShipments } from "@/entities/shipment";
import type { Actor } from "@/shared/actor";
import {
  authorizeExportRequest,
  authorizeMessage,
} from "../model/authorize-export";
import {
  createExportJobBodySchema,
  type ExportCriteria,
} from "../model/export-criteria";
import type { ExportJob } from "../model/export-job";
import { isArtifactExpired } from "../model/evaluate-export";
import {
  createAcceptedJob,
  getArtifactBody,
  getJob,
  listJobsForActor,
  resolveRuntimeActor,
} from "./job-store";

export type CreateExportResult =
  | { ok: true; job: ExportJob }
  | {
      ok: false;
      error: "invalid_body" | "export_not_allowed";
      message: string;
      details?: unknown;
    };

export function createExportJobForActor(
  actor: Actor,
  raw: unknown,
): CreateExportResult {
  const parsed = createExportJobBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_body",
      message: "依頼内容の形式が正しくありません。",
      details: parsed.error.flatten(),
    };
  }

  const criteria = parsed.data.criteria;
  const runtimeActor = resolveRuntimeActor(actor);
  const authz = authorizeExportRequest(runtimeActor, criteria);
  if (!authz.ok) {
    return {
      ok: false,
      error: "export_not_allowed",
      message: authorizeMessage(authz.reason),
    };
  }

  const estimated = listVisibleShipments(runtimeActor, criteria).length;

  const job = createAcceptedJob({
    criteria,
    actor: runtimeActor,
    estimatedRowCount: estimated,
  });

  return { ok: true, job };
}

export function getJobsForActor(actor: Actor): ExportJob[] {
  return listJobsForActor(actor);
}

export function getJobForActor(
  actor: Actor,
  id: string,
):
  | { ok: true; job: ExportJob }
  | { ok: false; error: "not_found" | "forbidden"; message: string } {
  const job = getJob(id);
  if (!job) {
    return {
      ok: false,
      error: "not_found",
      message: "指定した依頼が見つかりません。",
    };
  }
  const visible = listJobsForActor(actor).some((j) => j.id === id);
  if (!visible) {
    return {
      ok: false,
      error: "forbidden",
      message: "この依頼を閲覧する権限がありません。",
    };
  }
  const { csvBody: _, ...pub } = job;
  return { ok: true, job: pub };
}

export type DownloadResult =
  | {
      ok: true;
      fileName: string;
      contentType: string;
      body: string;
    }
  | {
      ok: false;
      error:
        | "not_found"
        | "forbidden"
        | "artifact_not_ready"
        | "artifact_expired"
        | "artifact_unavailable";
      message: string;
      status: number;
    };

export function downloadArtifactForActor(
  actor: Actor,
  id: string,
  now: Date = new Date(),
): DownloadResult {
  const access = getJobForActor(actor, id);
  if (!access.ok) {
    return {
      ok: false,
      error: access.error,
      message: access.message,
      status: access.error === "not_found" ? 404 : 403,
    };
  }

  const job = access.job;

  if (job.status === "accepted" || job.status === "running") {
    return {
      ok: false,
      error: "artifact_not_ready",
      message:
        "まだ処理が完了していません。進捗が「完了」になってから受け取ってください。",
      status: 409,
    };
  }

  if (job.status === "failed") {
    return {
      ok: false,
      error: "artifact_unavailable",
      message:
        job.failureMessage ??
        "この依頼は失敗したため成果物はありません。条件を見直して再依頼してください。",
      status: 409,
    };
  }

  if (!job.artifact) {
    return {
      ok: false,
      error: "artifact_unavailable",
      message: "成果物がありません。",
      status: 409,
    };
  }

  if (isArtifactExpired(job.artifact.expiresAt, now)) {
    return {
      ok: false,
      error: "artifact_expired",
      message:
        "成果物の保管期限が過ぎたため受け取れません。同じ条件で再依頼してください。",
      status: 410,
    };
  }

  const body = getArtifactBody(id);
  if (!body) {
    return {
      ok: false,
      error: "artifact_unavailable",
      message: "成果物データが見つかりません。",
      status: 409,
    };
  }

  return {
    ok: true,
    fileName: job.artifact.fileName,
    contentType: job.artifact.contentType,
    body: body.body,
  };
}

export type { ExportCriteria };
