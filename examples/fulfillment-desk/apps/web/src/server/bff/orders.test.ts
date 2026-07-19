import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPorts } from "@/server/external";
import { createOrderBff } from "./orders";

const ports = createDefaultPorts();
const bff = createOrderBff({ ports, correlationId: "corr_test" });

beforeEach(() => {
  ports.reset();
});

describe("BFF orders", () => {
  it("lists summaries with oms provenance only", async () => {
    const result = await bff.listOrders({ status: "ready_to_ship" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.every((o) => o.status === "ready_to_ship")).toBe(
        true,
      );
      expect(result.data.provenance.correlationId).toBe("corr_test");
      expect(result.data.provenance.calls).toEqual([
        expect.objectContaining({
          system: "oms",
          operation: "list_orders",
          ok: true,
        }),
      ]);
    }
  });

  it("composes customer + inventory and records N calls", async () => {
    const result = await bff.getOrderDetail("ord_002");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.order.customer.name).toBe("Beta Industries");
      expect(result.data.order.lines[0]?.shortfall).toBe(2);
      expect(result.data.order.canShipByStock).toBe(false);
      const systems = result.data.provenance.calls.map((c) => c.system);
      expect(systems).toEqual(["oms", "customer", "inventory"]);
    }
  });

  it("fails composition when customer SoR has no row (no invented name)", async () => {
    const result = await bff.getOrderDetail("ord_orphan");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("composition_failed");
      expect(result.error.failedSystem).toBe("customer");
      expect(result.error.externalCode).toBe("not_found");
      expect(result.error.correlationId).toBe("corr_test");
    }
  });

  it("maps inventory shortage on ship", async () => {
    const result = await bff.shipOrder("ord_002", "YAMATO", {
      id: "operator",
      role: "operator",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("inventory_shortage");
      expect(result.error.shortages?.[0]?.sku).toBe("SKU-B");
    }
  });

  it("ships when stock is available and returns multi-call provenance", async () => {
    const result = await bff.shipOrder("ord_001", "SAGAWA", {
      id: "operator",
      role: "operator",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.order.status).toBe("shipped");
      expect(result.data.trackingNumber).toMatch(/^TRK-/);
      expect(result.data.provenance.calls.some((c) => c.operation === "ship_order")).toBe(
        true,
      );
      expect(
        result.data.provenance.calls.filter((c) => c.system === "oms").length,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("denies viewer ship", async () => {
    const result = await bff.shipOrder("ord_001", "SAGAWA", {
      id: "viewer",
      role: "viewer",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("missing_permission");
    }
  });

  it("maps rate limit with retryAfterSec", async () => {
    const result = await bff.shipOrder("ord_001", "SIMULATE_RATE_LIMIT", {
      id: "admin",
      role: "admin",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("external_rate_limited");
      expect(result.error.retryAfterSec).toBe(30);
    }
  });

  it("maps budget timeout on SIMULATE_TIMEOUT", async () => {
    const tight = createOrderBff({ ports, callBudgetMs: 15, correlationId: "corr_to" });
    const result = await tight.shipOrder("ord_003", "SIMULATE_TIMEOUT", {
      id: "admin",
      role: "admin",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("external_timeout");
    }
  });
});
