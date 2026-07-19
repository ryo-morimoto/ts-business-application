import { describe, expect, it } from "vitest";
import { runForeignCall } from "./call";

describe("runForeignCall", () => {
  it("returns execute result when under budget", async () => {
    const r = await runForeignCall({ budgetMs: 100 }, () => ({
      ok: true as const,
      data: 42,
    }));
    expect(r).toEqual({ ok: true, data: 42 });
  });

  it("returns foreign timeout when latency exceeds budget", async () => {
    const r = await runForeignCall(
      { budgetMs: 20, latencyMs: 50 },
      () => ({ ok: true as const, data: "late" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.err_code).toBe("timeout");
    }
  });
});
