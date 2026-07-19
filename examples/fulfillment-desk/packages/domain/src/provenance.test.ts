import { describe, expect, it } from "vitest";
import { ProvenanceCollector, newCorrelationId } from "./provenance";

describe("ProvenanceCollector", () => {
  it("records calls and freezes total duration", () => {
    let t = 1000;
    const c = new ProvenanceCollector("corr_x", () => t);
    c.record({
      system: "oms",
      operation: "get_order",
      ok: true,
      durationMs: 2,
    });
    t = 1007;
    c.record({
      system: "customer",
      operation: "get",
      ok: true,
      durationMs: 1,
    });
    t = 1010;
    const frozen = c.freeze();
    expect(frozen.correlationId).toBe("corr_x");
    expect(frozen.totalDurationMs).toBe(10);
    expect(frozen.calls).toHaveLength(2);
    expect(frozen.calls[0]?.system).toBe("oms");
  });

  it("newCorrelationId is stable prefix", () => {
    expect(newCorrelationId(() => 0.123456789)).toMatch(/^corr_/);
  });
});
