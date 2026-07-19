import { describe, expect, it } from "vitest";
import {
  diffEditable,
  parseEditable,
  previewComplianceImpact,
} from "./editable";
import { defaultEditable } from "./evaluate";

describe("parseEditable", () => {
  it("accepts valid M keys", () => {
    const r = parseEditable({
      identityThresholdYen: 10_000,
      alwaysIdCategories: ["game_soft", "game_soft", "ac_outdoor"],
      forceIdentityAll: false,
      amlCashThresholdYen: 2_000_000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.alwaysIdCategories).toEqual(["game_soft", "ac_outdoor"]);
  });

  it("rejects negative and non-integer thresholds", () => {
    const r = parseEditable({
      identityThresholdYen: -1,
      alwaysIdCategories: [],
      forceIdentityAll: false,
      amlCashThresholdYen: 1.5,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors.identityThresholdYen).toBeTruthy();
    expect(r.fieldErrors.amlCashThresholdYen).toBeTruthy();
  });

  it("rejects unknown category", () => {
    const r = parseEditable({
      identityThresholdYen: 0,
      alwaysIdCategories: ["not_a_cat"],
      forceIdentityAll: false,
      amlCashThresholdYen: 0,
    });
    expect(r.ok).toBe(false);
  });
});

describe("diffEditable / impact", () => {
  it("diffs changed keys only", () => {
    const a = defaultEditable();
    const b = { ...a, forceIdentityAll: true, identityThresholdYen: 1 };
    const d = diffEditable(a, b);
    expect(d.map((x) => x.key).sort()).toEqual([
      "forceIdentityAll",
      "identityThresholdYen",
    ]);
  });

  it("preview shows forceIdentityAll effect on apparel_8k", () => {
    const base = previewComplianceImpact(defaultEditable());
    const forced = previewComplianceImpact({
      ...defaultEditable(),
      forceIdentityAll: true,
    });
    const b = base.find((s) => s.id === "apparel_8k");
    const f = forced.find((s) => s.id === "apparel_8k");
    expect(b?.needIdentity).toBe(false);
    expect(f?.needIdentity).toBe(true);
  });
});
