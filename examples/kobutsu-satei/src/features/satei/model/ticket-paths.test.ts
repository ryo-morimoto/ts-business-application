import { describe, expect, it } from "vitest";
import {
  addLine,
  getFieldValue,
  removeLine,
  setFieldValue,
} from "./ticket-paths";
import type { FormFieldPlan, Ticket } from "./types";

function ticket(): Ticket {
  return {
    id: "t1",
    ownerActorId: "a",
    channel: "store",
    paymentMethod: "transfer",
    seller: {},
    idCheck: { status: "pending" },
    aml: {},
    lines: [],
    ruleSetVersion: 1,
    status: "open",
    suspiciousReportIds: [],
    createdAt: "",
    updatedAt: "",
  };
}

describe("ticket-paths", () => {
  it("sets and reads ticket-level paths", () => {
    let t = ticket();
    const field: FormFieldPlan = {
      id: "seller.name",
      label: "氏名",
      kind: "text",
      visible: true,
      required: true,
      group: "seller",
    };
    t = setFieldValue(t, field, "山田");
    expect(getFieldValue(t, "seller.name")).toBe("山田");
  });

  it("add/remove line and set attrs; category change clears attrs", () => {
    let t = addLine(ticket(), "apparel");
    expect(t.lines).toHaveLength(1);
    const lineId = t.lines[0]!.id;
    const brand: FormFieldPlan = {
      id: "brand",
      label: "b",
      kind: "text",
      visible: true,
      required: true,
      group: "line",
      lineId,
    };
    t = setFieldValue(t, brand, "Uniqlo");
    expect(t.lines[0]!.attrs.brand).toBe("Uniqlo");

    const cat: FormFieldPlan = {
      id: "category",
      label: "c",
      kind: "select",
      visible: true,
      required: true,
      group: "line",
      lineId,
    };
    t = setFieldValue(t, cat, "game_soft");
    expect(t.lines[0]!.category).toBe("game_soft");
    expect(t.lines[0]!.attrs).toEqual({});

    t = removeLine(t, lineId);
    expect(t.lines).toHaveLength(0);
  });
});
