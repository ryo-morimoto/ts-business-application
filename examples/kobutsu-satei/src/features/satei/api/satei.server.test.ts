import { beforeEach, describe, expect, it } from "vitest";
import {
  acceptTicket,
  cloneRuleSet,
  createTicket,
  discardRuleSetDraft,
  getRuleSetView,
  getTicketView,
  patchTicket,
  publishRuleSet,
  repinRuleSet,
  reportSuspicious,
  resetSateiStore,
  updateRuleSetDraft,
} from "./satei.server";
import { ACTORS } from "~/shared/actor/actor";

const appraiser = ACTORS.appraiser;
const compliance = ACTORS.compliance;

beforeEach(() => {
  resetSateiStore();
});

describe("satei.server lifecycle", () => {
  it("pins active RuleSet on create", () => {
    const created = createTicket(appraiser, { channel: "store" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.ticket.ruleSetVersion).toBe(1);
    expect(created.value.plan.computed.pinStale).toBe(false);
  });

  it("accepts exempt apparel after full patch", () => {
    const created = createTicket(appraiser, { channel: "store" });
    if (!created.ok) throw new Error("create failed");
    const id = created.value.ticket.id;

    const patched = patchTicket(appraiser, id, {
      paymentMethod: "transfer",
      authenticity: "pass",
      lines: [
        {
          category: "apparel",
          offerAmount: 8000,
          attrs: { brand: "Uniqlo", condition: "good" },
        },
      ],
    });
    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(patched.value.plan.computed.needIdentity).toBe(false);
    expect(patched.value.plan.computed.ledgerReady).toBe(true);

    const accepted = acceptTicket(appraiser, id);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.ticket.status).toBe("accepted");
    expect(accepted.value.ledger?.totalAmount).toBe(8000);
  });

  it("blocks accept for game_soft without identity", () => {
    const created = createTicket(appraiser, { channel: "store" });
    if (!created.ok) throw new Error("create failed");
    const id = created.value.ticket.id;
    patchTicket(appraiser, id, {
      paymentMethod: "transfer",
      lines: [
        {
          category: "game_soft",
          offerAmount: 3000,
          attrs: { title: "G", platform: "switch", working: true },
        },
      ],
    });
    const denied = acceptTicket(appraiser, id);
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.code).toBe("accept_blocked");
  });

  it("keeps pin until explicit repin after publish", () => {
    const created = createTicket(appraiser, { channel: "store" });
    if (!created.ok) throw new Error("create failed");
    const id = created.value.ticket.id;
    expect(created.value.ticket.ruleSetVersion).toBe(1);

    const draft = cloneRuleSet(compliance);
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    const draftVer = draft.value.ruleSet.version;
    const updated = updateRuleSetDraft(compliance, draftVer, {
      editable: {
        ...draft.value.ruleSet.editable,
        forceIdentityAll: true,
      },
      label: "force all id",
    });
    expect(updated.ok).toBe(true);
    const published = publishRuleSet(compliance, draftVer);
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    expect(published.value.ruleSet.status).toBe("active");
    expect(published.value.isActive).toBe(true);

    const stillPinned = getTicketView(appraiser, id);
    expect(stillPinned.ok).toBe(true);
    if (!stillPinned.ok) return;
    expect(stillPinned.value.ticket.ruleSetVersion).toBe(1);
    expect(stillPinned.value.plan.computed.pinStale).toBe(true);

    const repinned = repinRuleSet(appraiser, id);
    expect(repinned.ok).toBe(true);
    if (!repinned.ok) return;
    expect(repinned.value.ticket.ruleSetVersion).toBe(draftVer);
    const withLine = patchTicket(appraiser, id, {
      paymentMethod: "transfer",
      authenticity: "pass",
      lines: [
        {
          category: "apparel",
          offerAmount: 1000,
          attrs: { brand: "X", condition: "good" },
        },
      ],
    });
    expect(withLine.ok).toBe(true);
    if (!withLine.ok) return;
    expect(withLine.value.plan.computed.needIdentity).toBe(true);
  });

  it("CMS: clone, validate, discard, publish lifecycle", () => {
    const cloned = cloneRuleSet(compliance, 1);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) return;
    expect(cloned.value.ruleSet.status).toBe("draft");
    expect(cloned.value.parent?.version).toBe(1);
    expect(cloned.value.diffs).toHaveLength(0);

    const bad = updateRuleSetDraft(compliance, cloned.value.ruleSet.version, {
      editable: {
        identityThresholdYen: -5,
        alwaysIdCategories: ["game_soft"],
        forceIdentityAll: false,
        amlCashThresholdYen: 100,
      },
    });
    expect(bad.ok).toBe(false);

    const good = updateRuleSetDraft(compliance, cloned.value.ruleSet.version, {
      editable: {
        identityThresholdYen: 5000,
        alwaysIdCategories: ["game_soft", "apparel"],
        forceIdentityAll: false,
        amlCashThresholdYen: 1_000_000,
      },
      label: "stricter thresholds",
    });
    expect(good.ok).toBe(true);
    if (!good.ok) return;
    expect(good.value.diffs.some((d) => d.key === "identityThresholdYen")).toBe(
      true,
    );
    expect(
      good.value.impact.find((s) => s.id === "apparel_8k")?.needIdentity,
    ).toBe(true);

    const discarded = discardRuleSetDraft(
      compliance,
      cloned.value.ruleSet.version,
    );
    expect(discarded.ok).toBe(true);
    const gone = getRuleSetView(compliance, cloned.value.ruleSet.version);
    expect(gone.ok).toBe(false);

    const again = cloneRuleSet(compliance);
    if (!again.ok) throw new Error("clone2");
    updateRuleSetDraft(compliance, again.value.ruleSet.version, {
      editable: {
        ...again.value.ruleSet.editable,
        forceIdentityAll: true,
      },
    });
    const pub = publishRuleSet(compliance, again.value.ruleSet.version);
    expect(pub.ok).toBe(true);
    const v1 = getRuleSetView(compliance, 1);
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(v1.value.ruleSet.status).toBe("retired");
  });

  it("records suspicious report without accepting", () => {
    const created = createTicket(appraiser, { channel: "store" });
    if (!created.ok) throw new Error("create failed");
    const id = created.value.ticket.id;
    const reported = reportSuspicious(appraiser, {
      ticketId: id,
      reasonCode: "serial_tamper",
      note: "番号が不自然",
    });
    expect(reported.ok).toBe(true);
    if (!reported.ok) return;
    expect(reported.value.reports).toHaveLength(1);
    expect(reported.value.ticket.status).toBe("open");
  });

  it("rejects repin on accepted ticket", () => {
    const created = createTicket(appraiser, { channel: "store" });
    if (!created.ok) throw new Error("create failed");
    const id = created.value.ticket.id;
    patchTicket(appraiser, id, {
      paymentMethod: "transfer",
      authenticity: "pass",
      lines: [
        {
          category: "apparel",
          offerAmount: 5000,
          attrs: { brand: "A", condition: "good" },
        },
      ],
    });
    acceptTicket(appraiser, id);
    const repin = repinRuleSet(appraiser, id);
    expect(repin.ok).toBe(false);
    if (repin.ok) return;
    expect(repin.code).toBe("not_open");
  });
});
