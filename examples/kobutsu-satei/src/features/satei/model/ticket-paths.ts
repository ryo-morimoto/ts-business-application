/**
 * Single read/write surface for FormPlan field ids ↔ Ticket.
 * evaluate and UI must both use this (no duplicated path maps).
 */
import type {
  Authenticity,
  Category,
  Channel,
  FormFieldPlan,
  PaymentMethod,
  Ticket,
} from "./types";
import { CATEGORIES } from "./types";

export function getFieldValue(
  ticket: Ticket,
  fieldId: string,
  lineId?: string,
): unknown {
  if (lineId) {
    const line = ticket.lines.find((l) => l.id === lineId);
    if (!line) return undefined;
    if (fieldId === "category") return line.category;
    if (fieldId === "offerAmount") return line.offerAmount;
    return line.attrs[fieldId];
  }
  switch (fieldId) {
    case "channel":
      return ticket.channel;
    case "paymentMethod":
      return ticket.paymentMethod;
    case "authenticity":
      return ticket.authenticity;
    case "seller.name":
      return ticket.seller.name;
    case "seller.address":
      return ticket.seller.address;
    case "seller.occupation":
      return ticket.seller.occupation;
    case "seller.age":
      return ticket.seller.age;
    case "idCheck.status":
      return ticket.idCheck.status;
    case "idCheck.docType":
      return ticket.idCheck.docType;
    case "idCheck.method":
      return ticket.idCheck.method;
    case "idCheck.remoteIdMethod":
      return ticket.idCheck.remoteIdMethod;
    case "aml.purpose":
      return ticket.aml.purpose;
    default:
      return undefined;
  }
}

export function getFieldValueAsString(
  ticket: Ticket,
  field: FormFieldPlan,
): string {
  const v = getFieldValue(ticket, field.id, field.lineId);
  if (v === undefined || v === null) return "";
  return String(v);
}

export function setFieldValue(
  ticket: Ticket,
  field: FormFieldPlan,
  value: string | number | boolean,
): Ticket {
  const next = structuredClone(ticket);

  if (field.lineId) {
    const line = next.lines.find((l) => l.id === field.lineId);
    if (!line) return next;
    if (field.id === "offerAmount") {
      line.offerAmount = typeof value === "number" ? value : Number(value);
      return next;
    }
    if (field.id === "category") {
      const cat = String(value) as Category;
      if (CATEGORIES.includes(cat) && cat !== line.category) {
        line.category = cat;
        // Category change clears attrs that no longer apply
        line.attrs = {};
      }
      return next;
    }
    line.attrs[field.id] = value;
    return next;
  }

  switch (field.id) {
    case "channel":
      next.channel = value as Channel;
      break;
    case "paymentMethod":
      next.paymentMethod = value as PaymentMethod;
      break;
    case "authenticity":
      next.authenticity = value as Authenticity;
      break;
    case "seller.name":
      next.seller.name = String(value);
      break;
    case "seller.address":
      next.seller.address = String(value);
      break;
    case "seller.occupation":
      next.seller.occupation = String(value);
      break;
    case "seller.age":
      next.seller.age = String(value);
      break;
    case "idCheck.status":
      next.idCheck.status = value as "pending" | "complete";
      break;
    case "idCheck.docType":
      next.idCheck.docType = String(value);
      break;
    case "idCheck.method":
      next.idCheck.method = String(value);
      break;
    case "idCheck.remoteIdMethod":
      next.idCheck.remoteIdMethod = String(value);
      break;
    case "aml.purpose":
      next.aml.purpose = String(value);
      break;
  }
  return next;
}

export function isBlank(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

export function addLine(ticket: Ticket, category: Category): Ticket {
  const id = `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    ...ticket,
    lines: [
      ...ticket.lines,
      { id, category, offerAmount: 0, attrs: {} },
    ],
  };
}

export function removeLine(ticket: Ticket, lineId: string): Ticket {
  return {
    ...ticket,
    lines: ticket.lines.filter((l) => l.id !== lineId),
  };
}
