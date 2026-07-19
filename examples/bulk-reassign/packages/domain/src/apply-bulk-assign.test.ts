import { describe, expect, it } from "vitest";
import type { Customer } from "@bulk-reassign/contracts";
import { applyBulkAssign, summarizeBulkResult } from "./apply-bulk-assign";
import { resolveTargetIds } from "./resolve-targets";

const customers: Customer[] = [
  { id: "c-001", name: "Acme", assigneeId: "u-1" },
  { id: "c-002", name: "Beta", assigneeId: "u-1" },
  { id: "c-003", name: "Gamma", assigneeId: null },
];

function mapOf(list: Customer[]) {
  return new Map(list.map((c) => [c.id, c]));
}

describe("resolveTargetIds", () => {
  it("uses page ids as-is", () => {
    const result = resolveTargetIds({
      scope: { mode: "page", ids: ["c-001", "c-003"] },
      customers,
    });
    expect(result).toEqual({
      targetIds: ["c-001", "c-003"],
      mode: "page",
      count: 2,
    });
  });

  it("resolves all_matching from server data, ignoring estimatedCount", () => {
    const result = resolveTargetIds({
      scope: {
        mode: "all_matching",
        filter: { query: "mm" }, // Gamma only
        excludedIds: [],
        estimatedCount: 999,
      },
      customers,
    });
    expect(result).toEqual({
      targetIds: ["c-003"],
      mode: "all_matching",
      count: 1,
    });
  });

  it("excludes ids from all_matching", () => {
    const result = resolveTargetIds({
      scope: {
        mode: "all_matching",
        filter: {},
        excludedIds: ["c-002"],
        estimatedCount: 3,
      },
      customers,
    });
    expect(result.targetIds).toEqual(["c-001", "c-003"]);
  });
});

describe("applyBulkAssign", () => {
  it("reports partial success and never silent-skips denied ids", () => {
    const denied = new Set(["c-003"]);
    const { result, nextCustomersById } = applyBulkAssign({
      requestId: "req-1",
      assigneeId: "u-9",
      targetIds: ["c-001", "c-002", "c-003"],
      customersById: mapOf(customers),
      actor: { id: "agent-a" },
      deniedCustomerIds: denied,
    });

    expect(result.succeeded.map((s) => s.id)).toEqual(["c-001", "c-002"]);
    expect(result.failed).toEqual([
      { id: "c-003", reason: "missing_permission" },
    ]);
    expect(summarizeBulkResult(result).isPartial).toBe(true);
    expect(nextCustomersById.get("c-001")?.assigneeId).toBe("u-9");
    expect(nextCustomersById.get("c-003")?.assigneeId).toBeNull();
  });

  it("marks missing ids as not_found", () => {
    const { result } = applyBulkAssign({
      requestId: "req-2",
      assigneeId: "u-9",
      targetIds: ["c-missing"],
      customersById: mapOf(customers),
      actor: { id: "admin" },
      deniedCustomerIds: new Set(),
    });
    expect(result.failed).toEqual([{ id: "c-missing", reason: "not_found" }]);
    expect(result.succeeded).toEqual([]);
  });
});
