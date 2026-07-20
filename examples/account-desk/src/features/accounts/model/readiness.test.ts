import { describe, expect, it } from "vitest";
import { computeReadiness } from "./readiness";
import { buildSeed } from "./seed";
import { filterSortPage } from "./filter";
import type { Account } from "./types";

describe("computeReadiness", () => {
  it("marks S-A healthy as ready", () => {
    const { accounts } = buildSeed();
    const sa = accounts.find((a) => a.id === "acc_sa")!;
    expect(computeReadiness(sa).ready).toBe(true);
  });

  it("flags S-B child missing bill_to", () => {
    const { accounts } = buildSeed();
    const child = accounts.find((a) => a.id === "acc_sb_child")!;
    const r = computeReadiness(child);
    expect(r.ready).toBe(false);
    expect(r.issues.some((i) => i.code === "missing_bill_to")).toBe(true);
  });

  it("flags credit hold without reason", () => {
    const { accounts } = buildSeed();
    const a = structuredClone(accounts.find((x) => x.id === "acc_sa")!) as Account;
    a.creditHold = true;
    a.creditHoldReason = "";
    const r = computeReadiness(a);
    expect(r.issues.some((i) => i.code === "credit_hold_without_reason")).toBe(
      true,
    );
  });
});

describe("filterSortPage", () => {
  it("separates empty vs zero", () => {
    const { accounts, ops } = buildSeed();
    const opsMap = new Map(ops.map((o) => [o.accountId, o]));
    const zero = filterSortPage(accounts, opsMap, { q: "___no_match___" });
    expect(zero.emptyKind).toBe("zero");
    expect(zero.total).toBe(0);

    const empty = filterSortPage([], opsMap, {});
    expect(empty.emptyKind).toBe("empty");
  });

  it("filters incomplete and creditHold", () => {
    const { accounts, ops } = buildSeed();
    const opsMap = new Map(ops.map((o) => [o.accountId, o]));
    const incomplete = filterSortPage(accounts, opsMap, { incomplete: true });
    expect(incomplete.items.every((i) => !i.readiness.ready)).toBe(true);
    expect(incomplete.items.some((i) => i.account.id === "acc_sb_child")).toBe(
      true,
    );

    const holds = filterSortPage(accounts, opsMap, { creditHold: true });
    expect(holds.items.every((i) => i.account.creditHold)).toBe(true);
    expect(holds.items.some((i) => i.account.id === "acc_sc")).toBe(true);
  });
});
