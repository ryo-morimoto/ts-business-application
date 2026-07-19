import { describe, expect, it } from "vitest";
import {
  filterShipments,
  type Shipment,
} from "@/entities/shipment";
import { resolveActor, withWarehouseScope } from "@/shared/actor";
import { authorizeExportRequest } from "./authorize-export";
import { buildShipmentCsv } from "./build-csv";
import type { ExportCriteria } from "./export-criteria";
import { evaluateExport } from "./evaluate-export";

const shipments: Shipment[] = [
  {
    id: "sh-001",
    orderNo: "ORD-1",
    warehouseId: "WH-A",
    status: "allocated",
    assigneeId: "clerk",
    sku: "SKU-1",
    quantity: 2,
    plannedShipDate: "2026-03-01",
  },
  {
    id: "sh-002",
    orderNo: "ORD-2",
    warehouseId: "WH-B",
    status: "shipped",
    assigneeId: "clerk",
    sku: "SKU-2",
    quantity: 1,
    plannedShipDate: "2026-03-02",
  },
  {
    id: "sh-003",
    orderNo: "ORD-3",
    warehouseId: "WH-C",
    status: "allocated",
    assigneeId: "manager",
    sku: "SKU-3",
    quantity: 5,
    plannedShipDate: "2026-03-03",
  },
  {
    id: "sh-004",
    orderNo: "ORD-4",
    warehouseId: "WH-X",
    status: "draft",
    assigneeId: "admin",
    sku: "SKU-4",
    quantity: 1,
    plannedShipDate: "2026-03-04",
  },
];

const now = new Date("2026-03-10T12:00:00.000Z");

describe("authorizeExportRequest", () => {
  it("rejects outsider", () => {
    const r = authorizeExportRequest(resolveActor("outsider"), {});
    expect(r).toEqual({ ok: false, reason: "no_warehouse_access" });
  });

  it("rejects clerk requesting WH-C", () => {
    const r = authorizeExportRequest(resolveActor("clerk"), {
      warehouseId: "WH-C",
    });
    expect(r).toEqual({ ok: false, reason: "warehouse_out_of_scope" });
  });

  it("allows clerk requesting WH-A", () => {
    const r = authorizeExportRequest(resolveActor("clerk"), {
      warehouseId: "WH-A",
    });
    expect(r).toEqual({ ok: true });
  });
});

describe("filterShipments", () => {
  it("never leaks warehouses outside actor scope", () => {
    const rows = filterShipments(shipments, {}, resolveActor("clerk"));
    expect(rows.map((r) => r.id)).toEqual(["sh-001", "sh-002"]);
  });
});

describe("evaluateExport", () => {
  it("completes with csv for in-scope rows", () => {
    const result = evaluateExport({
      shipments,
      criteria: { warehouseId: "WH-A" },
      actor: resolveActor("clerk"),
      jobId: "job-1",
      now,
      rowLimit: 25,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain("sh-001");
    expect(result.csv).not.toContain("sh-003");
    expect(result.expiresAt).toBe("2026-03-17T12:00:00.000Z");
  });

  it("fails empty_result without delivering empty success file", () => {
    const criteria: ExportCriteria = { status: "cancelled" };
    const result = evaluateExport({
      shipments,
      criteria,
      actor: resolveActor("admin"),
      jobId: "job-empty",
      now,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "empty_result",
      matchedCount: 0,
    });
  });

  it("fails row_limit_exceeded without partial file", () => {
    const many: Shipment[] = Array.from({ length: 5 }, (_, i) => ({
      id: `sh-x${i}`,
      orderNo: `ORD-x${i}`,
      warehouseId: "WH-A" as const,
      status: "allocated" as const,
      assigneeId: "clerk",
      sku: "SKU",
      quantity: 1,
      plannedShipDate: "2026-03-01",
    }));
    const result = evaluateExport({
      shipments: many,
      criteria: {},
      actor: resolveActor("clerk"),
      jobId: "job-limit",
      now,
      rowLimit: 3,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "row_limit_exceeded",
      matchedCount: 5,
    });
  });

  it("fails unauthorized_scope when warehouse access revoked before process", () => {
    const revoked = withWarehouseScope(resolveActor("clerk"), []);
    const result = evaluateExport({
      shipments,
      criteria: { warehouseId: "WH-A" },
      actor: revoked,
      jobId: "job-authz",
      now,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "unauthorized_scope",
    });
  });
});

describe("buildShipmentCsv", () => {
  it("escapes commas and quotes", () => {
    const csv = buildShipmentCsv([
      {
        id: 'a"b',
        orderNo: "x,y",
        warehouseId: "WH-A",
        status: "draft",
        assigneeId: "c",
        sku: "s",
        quantity: 1,
        plannedShipDate: "2026-01-01",
      },
    ]);
    expect(csv).toContain('"a""b"');
    expect(csv).toContain('"x,y"');
  });
});
