import { describe, expect, it } from "vitest";
import { parseOrderListFilters } from "./list-filters";

describe("parseOrderListFilters", () => {
  it("accepts only status and warehouseId", () => {
    const result = parseOrderListFilters({
      status: "ready_to_ship",
      warehouseId: "wh_tokyo",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query).toEqual({
        status: "ready_to_ship",
        warehouseId: "wh_tokyo",
      });
    }
  });

  it("rejects free-text / customer filters instead of silently dropping them", () => {
    const result = parseOrderListFilters({
      status: "ready_to_ship",
      q: "acme",
      customerName: "Acme",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unsupported_filter");
      expect(result.error.rejectedFilters).toEqual(
        expect.arrayContaining(["q", "customerName"]),
      );
      expect(result.error.allowedFilters).toEqual(["status", "warehouseId"]);
    }
  });

  it("rejects invalid status values", () => {
    const result = parseOrderListFilters({ status: "bogus" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_body");
    }
  });
});
