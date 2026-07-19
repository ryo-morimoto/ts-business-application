import { describe, expect, it } from "vitest";
import { applyOrderUpdate, orderTotal } from "./apply-update";
import type { Order } from "./schemas";

const base: Order = {
  id: "ord_1",
  customerName: "Acme",
  note: "",
  version: 3,
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "alice",
  lines: [
    {
      id: "ln_1",
      sku: "SKU-A",
      description: "Widget",
      quantity: 2,
      unitPrice: 10,
    },
  ],
};

describe("applyOrderUpdate", () => {
  it("increments version and applies patch when expectedVersion matches", () => {
    const result = applyOrderUpdate({
      current: base,
      actorId: "bob",
      now: "2026-02-01T00:00:00.000Z",
      patch: {
        id: "ord_1",
        expectedVersion: 3,
        customerName: "Acme Co",
        note: "rush",
        lines: [
          {
            id: "ln_1",
            sku: "SKU-A",
            description: "Widget",
            quantity: 5,
            unitPrice: 10,
          },
        ],
      },
    });

    expect(result).toEqual({
      ok: true,
      order: {
        id: "ord_1",
        customerName: "Acme Co",
        note: "rush",
        version: 4,
        updatedAt: "2026-02-01T00:00:00.000Z",
        updatedBy: "bob",
        lines: [
          {
            id: "ln_1",
            sku: "SKU-A",
            description: "Widget",
            quantity: 5,
            unitPrice: 10,
          },
        ],
      },
    });
  });

  it("rejects last-write-wins when expectedVersion is stale", () => {
    const result = applyOrderUpdate({
      current: base,
      actorId: "bob",
      patch: {
        id: "ord_1",
        expectedVersion: 2,
        customerName: "Stale",
        note: "",
        lines: base.lines,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("version_conflict");
    if (result.code !== "version_conflict") return;
    expect(result.yourExpected).toBe(2);
    expect(result.current.version).toBe(3);
    expect(result.current.customerName).toBe("Acme");
  });

  it("returns not_found when order is missing", () => {
    const result = applyOrderUpdate({
      current: undefined,
      actorId: "bob",
      patch: {
        id: "ord_missing",
        expectedVersion: 1,
        customerName: "X",
        note: "",
        lines: base.lines,
      },
    });
    expect(result).toEqual({ ok: false, code: "not_found" });
  });

  it("does not mutate the current order on conflict", () => {
    const snapshot = structuredClone(base);
    applyOrderUpdate({
      current: base,
      actorId: "bob",
      patch: {
        id: "ord_1",
        expectedVersion: 1,
        customerName: "Hacked",
        note: "nope",
        lines: [
          {
            id: "ln_1",
            sku: "X",
            description: "X",
            quantity: 99,
            unitPrice: 0,
          },
        ],
      },
    });
    expect(base).toEqual(snapshot);
  });
});

describe("orderTotal", () => {
  it("sums line totals", () => {
    expect(orderTotal(base)).toBe(20);
  });
});
