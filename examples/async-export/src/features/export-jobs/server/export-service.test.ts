import { beforeEach, describe, expect, it } from "vitest";
import { resetShipments } from "@/entities/shipment";
import { resolveActor } from "@/shared/actor";
import {
  createExportJobForActor,
  downloadArtifactForActor,
  getJobForActor,
  getJobsForActor,
} from "./export-service";
import {
  processJobNow,
  resetExportJobs,
  setRuntimeWarehouseScope,
} from "./job-store";

beforeEach(() => {
  resetShipments();
  resetExportJobs();
});

describe("createExportJobForActor", () => {
  it("accepts job without delivering artifact", () => {
    const result = createExportJobForActor(resolveActor("clerk"), {
      criteria: { warehouseId: "WH-A", status: "allocated" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.status).toBe("accepted");
    expect(result.job.artifact).toBeNull();
    expect(result.job.criteria.warehouseId).toBe("WH-A");
  });

  it("rejects clerk for WH-C at request time", () => {
    const result = createExportJobForActor(resolveActor("clerk"), {
      criteria: { warehouseId: "WH-C" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("export_not_allowed");
    expect(result.message).toContain("権限");
  });

  it("rejects outsider", () => {
    const result = createExportJobForActor(resolveActor("outsider"), {
      criteria: {},
    });
    expect(result.ok).toBe(false);
  });
});

describe("job processing outcomes", () => {
  it("completes and allows download for owner", () => {
    const created = createExportJobForActor(resolveActor("clerk"), {
      criteria: { warehouseId: "WH-A", status: "allocated" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const done = processJobNow(created.job.id)!;
    expect(done.status).toBe("completed");
    expect(done.artifact?.rowCount).toBeGreaterThan(0);

    const dl = downloadArtifactForActor(resolveActor("clerk"), created.job.id);
    expect(dl.ok).toBe(true);
    if (!dl.ok) return;
    expect(dl.body).toContain("warehouseId");
  });

  it("fails empty_result", () => {
    const created = createExportJobForActor(resolveActor("admin"), {
      criteria: {
        warehouseId: "WH-X",
        status: "cancelled",
        assigneeId: "nobody",
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const done = processJobNow(created.job.id)!;
    expect(done.status).toBe("failed");
    expect(done.failureReason).toBe("empty_result");
    expect(done.artifact).toBeNull();
  });

  it("fails row_limit_exceeded for wide criteria", () => {
    const created = createExportJobForActor(resolveActor("clerk"), {
      criteria: {},
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const done = processJobNow(created.job.id)!;
    expect(done.status).toBe("failed");
    expect(done.failureReason).toBe("row_limit_exceeded");
  });

  it("keeps criteria snapshot when list filters would change", () => {
    const created = createExportJobForActor(resolveActor("clerk"), {
      criteria: { warehouseId: "WH-A" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createExportJobForActor(resolveActor("clerk"), {
      criteria: { warehouseId: "WH-B" },
    });
    const again = getJobForActor(resolveActor("clerk"), created.job.id);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.job.criteria).toEqual({ warehouseId: "WH-A" });
  });

  it("fails unauthorized when scope revoked mid-flight", () => {
    const created = createExportJobForActor(resolveActor("clerk"), {
      criteria: { warehouseId: "WH-A", status: "allocated" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    setRuntimeWarehouseScope("clerk", []);
    const done = processJobNow(created.job.id)!;
    expect(done.status).toBe("failed");
    expect(done.failureReason).toBe("unauthorized_scope");
  });

  it("hides other users jobs from clerk", () => {
    const adminJob = createExportJobForActor(resolveActor("admin"), {
      criteria: { warehouseId: "WH-X", status: "draft" },
    });
    expect(adminJob.ok).toBe(true);
    if (!adminJob.ok) return;

    const clerkJobs = getJobsForActor(resolveActor("clerk"));
    expect(clerkJobs.find((j) => j.id === adminJob.job.id)).toBeUndefined();

    const denied = getJobForActor(resolveActor("clerk"), adminJob.job.id);
    expect(denied.ok).toBe(false);
  });

  it("manager can see org jobs", () => {
    const clerkJob = createExportJobForActor(resolveActor("clerk"), {
      criteria: { warehouseId: "WH-A", status: "draft" },
    });
    expect(clerkJob.ok).toBe(true);
    if (!clerkJob.ok) return;
    const managerJobs = getJobsForActor(resolveActor("manager"));
    expect(managerJobs.find((j) => j.id === clerkJob.job.id)).toBeDefined();
  });
});
