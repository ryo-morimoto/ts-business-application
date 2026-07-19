import { getShipments } from "@/entities/shipment";
import type { WarehouseId } from "@/shared/catalog/warehouse";
import {
  canViewJob,
  resolveActor,
  type Actor,
} from "@/shared/actor";
import type { ExportCriteria } from "../model/export-criteria";
import type { ExportJob } from "../model/export-job";
import { evaluateExport } from "../model/evaluate-export";

export type StoredJob = ExportJob & {
  csvBody: string | null;
};

type RuntimeScope = Map<string, readonly WarehouseId[]>;

type JobsState = {
  jobs: StoredJob[];
  seq: number;
  runtimeScopes: RuntimeScope;
  timers: Set<ReturnType<typeof setTimeout>>;
};

function initialState(): JobsState {
  return {
    jobs: [],
    seq: 0,
    runtimeScopes: new Map(),
    timers: new Set(),
  };
}

const globalForJobs = globalThis as unknown as {
  __asyncExportJobs?: JobsState;
};

function state(): JobsState {
  if (!globalForJobs.__asyncExportJobs) {
    globalForJobs.__asyncExportJobs = initialState();
  }
  return globalForJobs.__asyncExportJobs;
}

function clearTimers(s: JobsState): void {
  for (const t of s.timers) clearTimeout(t);
  s.timers.clear();
}

export function resetExportJobs(): void {
  const s = state();
  clearTimers(s);
  const next = initialState();
  s.jobs = next.jobs;
  s.seq = next.seq;
  s.runtimeScopes = next.runtimeScopes;
}

export function resolveRuntimeActor(base: Actor): Actor {
  const override = state().runtimeScopes.get(base.id);
  if (!override) return base;
  return { ...base, warehouseIds: [...override] };
}

export function setRuntimeWarehouseScope(
  actorId: string,
  warehouseIds: readonly WarehouseId[],
): void {
  state().runtimeScopes.set(actorId, warehouseIds);
}

export function clearRuntimeWarehouseScope(actorId: string): void {
  state().runtimeScopes.delete(actorId);
}

export function getJob(id: string): StoredJob | undefined {
  return state().jobs.find((j) => j.id === id);
}

function toPublicJob(job: StoredJob): ExportJob {
  const { csvBody: _, ...pub } = job;
  return pub;
}

export function listJobsForActor(actor: Actor): ExportJob[] {
  return state()
    .jobs.filter((j) => canViewJob(actor, j.requestedBy))
    .map(toPublicJob)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function createAcceptedJob(input: {
  criteria: ExportCriteria;
  actor: Actor;
  estimatedRowCount: number;
  now?: Date;
}): ExportJob {
  const s = state();
  s.seq += 1;
  const now = input.now ?? new Date();
  const id = `exp-${String(s.seq).padStart(4, "0")}`;

  const job: StoredJob = {
    id,
    criteria: structuredClone(input.criteria),
    status: "accepted",
    requestedBy: input.actor.id,
    requestedAt: now.toISOString(),
    startedAt: null,
    finishedAt: null,
    failureReason: null,
    failureMessage: null,
    estimatedRowCount: input.estimatedRowCount,
    artifact: null,
    csvBody: null,
  };

  s.jobs.unshift(job);
  scheduleProcessing(id);
  return toPublicJob(job);
}

function scheduleTimer(fn: () => void, ms: number): void {
  const s = state();
  const handle = setTimeout(() => {
    s.timers.delete(handle);
    fn();
  }, ms);
  s.timers.add(handle);
}

function scheduleProcessing(jobId: string): void {
  scheduleTimer(() => {
    const job = getJob(jobId);
    if (!job || job.status !== "accepted") return;
    job.status = "running";
    job.startedAt = new Date().toISOString();
    scheduleTimer(() => finishJob(jobId), 400);
  }, 350);
}

function finishJob(jobId: string): void {
  const job = getJob(jobId);
  if (!job || job.status !== "running") return;

  const baseActor = resolveActor(job.requestedBy);
  const actor = resolveRuntimeActor(baseActor);
  const now = new Date();

  const result = evaluateExport({
    shipments: getShipments(),
    criteria: job.criteria,
    actor,
    jobId: job.id,
    now,
  });

  job.finishedAt = now.toISOString();

  if (!result.ok) {
    job.status = "failed";
    job.failureReason = result.reason;
    job.failureMessage = result.message;
    job.artifact = null;
    job.csvBody = null;
    return;
  }

  job.status = "completed";
  job.failureReason = null;
  job.failureMessage = null;
  job.csvBody = result.csv;
  job.artifact = {
    fileName: result.fileName,
    contentType: "text/csv; charset=utf-8",
    rowCount: result.rowCount,
    expiresAt: result.expiresAt,
    byteLength: Buffer.byteLength(result.csv, "utf8"),
  };
}

export function processJobNow(jobId: string): ExportJob | undefined {
  const job = getJob(jobId);
  if (!job) return undefined;
  if (job.status === "accepted") {
    job.status = "running";
    job.startedAt = new Date().toISOString();
  }
  if (job.status === "running") {
    finishJob(jobId);
  }
  return toPublicJob(getJob(jobId)!);
}

export function expireArtifact(jobId: string): boolean {
  const job = getJob(jobId);
  if (!job?.artifact) return false;
  job.artifact = {
    ...job.artifact,
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  };
  return true;
}

export function getArtifactBody(
  jobId: string,
): { job: StoredJob; body: string } | null {
  const job = getJob(jobId);
  if (!job || job.status !== "completed" || !job.csvBody) return null;
  return { job, body: job.csvBody };
}
