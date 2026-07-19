import { beforeEach, describe, expect, it } from "vitest";
import { resolveActor } from "@/shared/actor";
import {
  create,
  get,
  goNext,
  resetStore,
  save,
  submit,
} from "../index";

const author = resolveActor("author");
const viewer = resolveActor("viewer");

beforeEach(() => {
  resetStore();
});

describe("drafting deep module", () => {
  it("create → save basics → goNext → lines → submit", () => {
    const c = create(author);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const id = c.draft.id;

    const s1 = save(author, id, {
      title: "コピー用紙",
      vendorName: "Office Co",
      note: "急ぎ",
    });
    expect(s1.ok).toBe(true);

    const n1 = goNext(author, id, "basics");
    expect(n1.ok).toBe(true);
    if (!n1.ok) return;
    expect(n1.step).toBe("lines");

    const s2 = save(author, id, {
      lines: [{ sku: "PAPER-A4", quantity: 10, unitPrice: 500 }],
    });
    expect(s2.ok).toBe(true);

    const n2 = goNext(author, id, "lines");
    expect(n2.ok).toBe(true);
    if (!n2.ok) return;
    expect(n2.step).toBe("review");

    const sub = submit(author, id);
    expect(sub.ok).toBe(true);
    if (!sub.ok) return;
    expect(sub.submitted.payload.title).toBe("コピー用紙");
    expect(sub.submitted.payload.lines).toHaveLength(1);

    const again = submit(author, id);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe("already_submitted");
  });

  it("rejects goNext when basics incomplete", () => {
    const c = create(author);
    if (!c.ok) return;
    const n = goNext(author, idOf(c), "basics", { title: "" });
    expect(n.ok).toBe(false);
    if (n.ok) return;
    expect(n.code).toBe("step_invalid");
  });

  it("rejects invalid date format on save (missing ok)", () => {
    const c = create(author);
    if (!c.ok) return;
    const id = c.draft.id;
    const okEmpty = save(author, id, {});
    expect(okEmpty.ok).toBe(true);
    const bad = save(author, id, { neededBy: "not-a-date" });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.code).toBe("validation_failed");
  });

  it("rejects submit when incomplete", () => {
    const c = create(author);
    if (!c.ok) return;
    const id = c.draft.id;
    save(author, id, { title: "x", vendorName: "y" });
    const sub = submit(author, id);
    expect(sub.ok).toBe(false);
    if (sub.ok) return;
    expect(sub.code).toBe("submit_invalid");
  });

  it("viewer cannot create or edit", () => {
    const c = create(viewer);
    expect(c.ok).toBe(false);
    const a = create(author);
    if (!a.ok) return;
    const s = save(viewer, a.draft.id, { title: "hack" });
    expect(s.ok).toBe(false);
    if (s.ok) return;
    expect(s.code).toBe("forbidden");
  });

  it("get returns submitted view after submit", () => {
    const c = create(author);
    if (!c.ok) return;
    const id = c.draft.id;
    save(author, id, {
      title: "T",
      vendorName: "V",
      lines: [{ sku: "S1", quantity: 1 }],
    });
    goNext(author, id, "basics");
    goNext(author, id, "lines");
    submit(author, id);
    const g = get(author, id);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.view.kind).toBe("submitted");
  });
});

function idOf(c: { ok: true; draft: { id: string } }): string {
  return c.draft.id;
}
