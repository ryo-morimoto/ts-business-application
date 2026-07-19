import { describe, expect, it } from "vitest";
import { computeCompliance, defaultEditable, evaluate } from "./evaluate";
import { seedLayers } from "./seed-rules";
import type { RuleSet, Ticket } from "./types";

function baseTicket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: "t1",
    ownerActorId: "appraiser",
    channel: "store",
    paymentMethod: "transfer",
    seller: {},
    idCheck: { status: "pending" },
    aml: {},
    lines: [],
    ruleSetVersion: 1,
    status: "open",
    suspiciousReportIds: [],
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...over,
  };
}

function ruleSet(over: Partial<RuleSet["editable"]> = {}): RuleSet {
  const ts = "2026-07-20T00:00:00.000Z";
  return {
    version: 1,
    status: "active",
    label: "test",
    createdAt: ts,
    updatedAt: ts,
    publishedAt: ts,
    parentVersion: null,
    editable: { ...defaultEditable(), ...over },
    layers: seedLayers(),
  };
}

describe("computeCompliance", () => {
  it("exempts low-value apparel under threshold", () => {
    const t = baseTicket({
      lines: [
        {
          id: "ln1",
          category: "apparel",
          offerAmount: 8000,
          attrs: { brand: "X", condition: "good" },
        },
      ],
    });
    const c = computeCompliance(t, defaultEditable());
    expect(c.needIdentity).toBe(false);
    expect(c.totalAmount).toBe(8000);
  });

  it("requires identity for game_soft even under threshold", () => {
    const t = baseTicket({
      lines: [
        {
          id: "ln1",
          category: "game_soft",
          offerAmount: 3000,
          attrs: {},
        },
      ],
    });
    expect(computeCompliance(t, defaultEditable()).needIdentity).toBe(true);
  });

  it("requires identity when total crosses threshold", () => {
    const t = baseTicket({
      lines: [
        {
          id: "ln1",
          category: "apparel",
          offerAmount: 6000,
          attrs: {},
        },
        {
          id: "ln2",
          category: "apparel",
          offerAmount: 5000,
          attrs: {},
        },
      ],
    });
    expect(computeCompliance(t, defaultEditable()).needIdentity).toBe(true);
  });

  it("requires AML for jewelry + cash over threshold", () => {
    const t = baseTicket({
      paymentMethod: "cash",
      lines: [
        {
          id: "ln1",
          category: "watch_jewelry",
          offerAmount: 2_500_000,
          attrs: {},
        },
      ],
    });
    expect(computeCompliance(t, defaultEditable()).needAml).toBe(true);
  });

  it("forceIdentityAll overrides exemption", () => {
    const t = baseTicket({
      lines: [
        {
          id: "ln1",
          category: "apparel",
          offerAmount: 1000,
          attrs: {},
        },
      ],
    });
    expect(
      computeCompliance(t, {
        ...defaultEditable(),
        forceIdentityAll: true,
      }).needIdentity,
    ).toBe(true);
  });
});

describe("evaluate", () => {
  it("hides seller/id fields when identity not needed", () => {
    const t = baseTicket({
      paymentMethod: "transfer",
      authenticity: "pass",
      lines: [
        {
          id: "ln1",
          category: "apparel",
          offerAmount: 8000,
          attrs: { brand: "Uniqlo", condition: "good", size: "M" },
        },
      ],
    });
    const plan = evaluate(t, ruleSet(), { activeRuleSetVersion: 1 });
    expect(plan.computed.needIdentity).toBe(false);
    expect(plan.fields.some((f) => f.id === "seller.name" && f.visible)).toBe(
      false,
    );
    expect(plan.computed.ledgerReady).toBe(true);
  });

  it("blocks zero offer amount via appraisal rule", () => {
    const t = baseTicket({
      paymentMethod: "transfer",
      authenticity: "pass",
      lines: [
        {
          id: "ln1",
          category: "apparel",
          offerAmount: 0,
          attrs: { brand: "X", condition: "good" },
        },
      ],
    });
    const plan = evaluate(t, ruleSet(), { activeRuleSetVersion: 1 });
    expect(plan.blocks.some((b) => b.code === "offer_not_positive")).toBe(true);
    expect(plan.computed.ledgerReady).toBe(false);
  });

  it("blocks accept until id complete for always-id category", () => {
    const t = baseTicket({
      paymentMethod: "transfer",
      lines: [
        {
          id: "ln1",
          category: "game_soft",
          offerAmount: 3000,
          attrs: {
            title: "Sample Game",
            platform: "switch",
            working: true,
          },
        },
      ],
      idCheck: { status: "pending" },
    });
    const plan = evaluate(t, ruleSet(), { activeRuleSetVersion: 1 });
    expect(plan.computed.needIdentity).toBe(true);
    expect(plan.computed.ledgerReady).toBe(false);
    expect(plan.blocks.some((b) => b.code === "missing_required")).toBe(true);

    const ready: Ticket = {
      ...t,
      seller: {
        name: "山田",
        address: "東京都",
        occupation: "会社員",
        age: "30",
      },
      idCheck: {
        status: "complete",
        docType: "drivers_license",
        method: "face_match_stub",
      },
    };
    const plan2 = evaluate(ready, ruleSet(), { activeRuleSetVersion: 1 });
    expect(plan2.computed.ledgerReady).toBe(true);
  });

  it("blocks on authenticity reject", () => {
    const t = baseTicket({
      paymentMethod: "cash",
      authenticity: "reject",
      lines: [
        {
          id: "ln1",
          category: "watch_jewelry",
          offerAmount: 100_000,
          attrs: {
            brand: "Rolex",
            model: "Sub",
            serial: "ABC",
          },
        },
      ],
      seller: {
        name: "A",
        address: "B",
        occupation: "C",
        age: "40",
      },
      idCheck: {
        status: "complete",
        docType: "drivers_license",
        method: "in_store",
      },
    });
    const plan = evaluate(t, ruleSet(), { activeRuleSetVersion: 1 });
    expect(plan.computed.ledgerReady).toBe(false);
    expect(plan.blocks.some((b) => b.code === "authenticity_reject")).toBe(
      true,
    );
  });

  it("marks pinStale when active differs", () => {
    const t = baseTicket({ ruleSetVersion: 1, lines: [] });
    const plan = evaluate(t, ruleSet(), { activeRuleSetVersion: 2 });
    expect(plan.computed.pinStale).toBe(true);
  });

  it("shows remote id method for mail_in when identity needed", () => {
    const t = baseTicket({
      channel: "mail_in",
      paymentMethod: "transfer",
      lines: [
        {
          id: "ln1",
          category: "game_soft",
          offerAmount: 1000,
          attrs: { title: "G", platform: "ps5", working: true },
        },
      ],
    });
    const plan = evaluate(t, ruleSet(), { activeRuleSetVersion: 1 });
    const remote = plan.fields.find((f) => f.id === "idCheck.remoteIdMethod");
    expect(remote?.visible).toBe(true);
    expect(remote?.required).toBe(true);
    const method = plan.fields.find((f) => f.id === "idCheck.method");
    expect(method?.visible).toBe(false);
  });

  it("emits catalog fields from pinned layers per category", () => {
    const t = baseTicket({
      paymentMethod: "transfer",
      authenticity: "pass",
      lines: [
        {
          id: "ln1",
          category: "watch_jewelry",
          offerAmount: 50_000,
          attrs: { brand: "R", model: "M", serial: "S" },
        },
      ],
      seller: {
        name: "A",
        address: "B",
        occupation: "C",
        age: "40",
      },
      idCheck: {
        status: "complete",
        docType: "drivers_license",
        method: "in_store",
      },
    });
    const plan = evaluate(t, ruleSet(), { activeRuleSetVersion: 1 });
    expect(
      plan.fields.some((f) => f.lineId === "ln1" && f.id === "serial"),
    ).toBe(true);
    expect(
      plan.fields.some((f) => f.lineId === "ln1" && f.id === "materials"),
    ).toBe(true);
    expect(plan.fields.some((f) => f.id === "authenticity")).toBe(true);
    expect(plan.computed.ledgerReady).toBe(true);
  });
});
