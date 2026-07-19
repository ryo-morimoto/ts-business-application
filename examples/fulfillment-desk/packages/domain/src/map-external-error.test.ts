import { describe, expect, it } from "vitest";
import {
  asCompositionFailure,
  httpStatusForAppError,
  mapExternalError,
} from "./map-external-error";

describe("mapExternalError", () => {
  it("maps rate_limited with retry_after_sec and correlation", () => {
    const app = mapExternalError(
      {
        err_code: "rate_limited",
        err_msg: "slow down",
        retry_after_sec: 30,
      },
      { correlationId: "corr_1", failedSystem: "oms", failedOperation: "ship" },
    );
    expect(app.code).toBe("external_rate_limited");
    expect(app.retryAfterSec).toBe(30);
    expect(app.correlationId).toBe("corr_1");
    expect(app.failedSystem).toBe("oms");
    expect(httpStatusForAppError(app.code)).toBe(429);
  });

  it("maps inventory_shortage with line details", () => {
    const app = mapExternalError({
      err_code: "inventory_shortage",
      err_msg: "not enough stock",
      details: {
        shortages: [{ sku: "SKU-B", requested: 5, available: 3 }],
      },
    });
    expect(app.code).toBe("inventory_shortage");
    expect(app.shortages).toEqual([
      { sku: "SKU-B", requested: 5, available: 3 },
    ]);
    expect(httpStatusForAppError(app.code)).toBe(409);
  });

  it("maps unknown codes to external_unavailable", () => {
    const app = mapExternalError({
      err_code: "weird_backend_thing",
      err_msg: "???",
    });
    expect(app.code).toBe("external_unavailable");
    expect(httpStatusForAppError(app.code)).toBe(502);
  });

  it("promotes mid-pipeline not_found to composition_failed", () => {
    const mapped = mapExternalError({
      err_code: "not_found",
      err_msg: "customer missing",
    });
    const app = asCompositionFailure(mapped, "customer", "get");
    expect(app.code).toBe("composition_failed");
    expect(app.failedSystem).toBe("customer");
    expect(app.externalCode).toBe("not_found");
    expect(httpStatusForAppError(app.code)).toBe(502);
  });
});
