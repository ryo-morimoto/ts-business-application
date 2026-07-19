import { describe, expect, it } from "vitest";
import type { ApprovalRequest } from "@approval-flow/contracts";
import { applyTransition } from "./apply-transition";
import { canTransition } from "./can-transition";
import type { Actor } from "./actor";

const base: ApprovalRequest = {
  id: "r-1",
  title: "Laptop",
  body: "Need a laptop",
  status: "draft",
  authorId: "author",
  rejectReason: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const author: Actor = { id: "author", role: "author" };
const reviewer: Actor = { id: "reviewer", role: "reviewer" };
const admin: Actor = { id: "admin", role: "admin" };

describe("canTransition", () => {
  it("allows author to submit draft", () => {
    expect(
      canTransition({ request: base, action: "submit", actor: author }),
    ).toEqual({ ok: true });
  });

  it("denies approve on draft (wrong_state)", () => {
    expect(
      canTransition({ request: base, action: "approve", actor: reviewer }),
    ).toEqual({ ok: false, reason: "wrong_state" });
  });

  it("denies author approve (missing_permission)", () => {
    const submitted = { ...base, status: "submitted" as const };
    expect(
      canTransition({ request: submitted, action: "approve", actor: author }),
    ).toEqual({ ok: false, reason: "missing_permission" });
  });

  it("requires reason on reject", () => {
    const submitted = { ...base, status: "submitted" as const };
    expect(
      canTransition({
        request: submitted,
        action: "reject",
        actor: reviewer,
        reason: "  ",
      }),
    ).toEqual({ ok: false, reason: "reason_required" });
  });

  it("allows reviewer reject with reason", () => {
    const submitted = { ...base, status: "submitted" as const };
    expect(
      canTransition({
        request: submitted,
        action: "reject",
        actor: reviewer,
        reason: "Incomplete",
      }),
    ).toEqual({ ok: true });
  });

  it("denies not_found", () => {
    expect(
      canTransition({ request: undefined, action: "submit", actor: author }),
    ).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("applyTransition", () => {
  it("moves draft → submitted", () => {
    const result = applyTransition({
      request: base,
      action: "submit",
      actor: author,
      now: "2026-02-01T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.status).toBe("submitted");
      expect(result.request.updatedAt).toBe("2026-02-01T00:00:00.000Z");
    }
  });

  it("admin can approve submitted", () => {
    const result = applyTransition({
      request: { ...base, status: "submitted" },
      action: "approve",
      actor: admin,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.status).toBe("approved");
  });

  it("does not apply when guard fails", () => {
    const result = applyTransition({
      request: base,
      action: "approve",
      actor: reviewer,
    });
    expect(result).toEqual({ ok: false, reason: "wrong_state" });
  });
});
