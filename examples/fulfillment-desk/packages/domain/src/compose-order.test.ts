import { describe, expect, it } from "vitest";
import { composeOrderDetail, toOrderSummary } from "./compose-order";

const order = {
  order_id: "ord_001",
  status: "ready_to_ship" as const,
  warehouse_id: "wh_tokyo",
  customer_id: "cust_01",
  line_items: [
    { sku: "SKU-A", qty: 2 },
    { sku: "SKU-B", qty: 5 },
  ],
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("composeOrderDetail", () => {
  it("merges customer + inventory into one app-facing detail", () => {
    const detail = composeOrderDetail(
      order,
      {
        cust_id: "cust_01",
        full_name: "Acme Corp",
        ship_to_city: "Tokyo",
      },
      [
        { sku: "SKU-A", warehouse_id: "wh_tokyo", available_qty: 10 },
        { sku: "SKU-B", warehouse_id: "wh_tokyo", available_qty: 3 },
      ],
    );

    expect(detail.customer).toEqual({
      id: "cust_01",
      name: "Acme Corp",
      shipCity: "Tokyo",
    });
    expect(detail.lines).toEqual([
      { sku: "SKU-A", qty: 2, availableQty: 10, shortfall: 0 },
      { sku: "SKU-B", qty: 5, availableQty: 3, shortfall: 2 },
    ]);
    expect(detail.canShipByStock).toBe(false);
    expect(toOrderSummary(order).lineCount).toBe(2);
  });
});
