import {
  diffEditable,
  parseEditable,
  previewComplianceImpact,
} from "../model/editable";
import { evaluate, projectLedger, defaultEditable } from "../model/evaluate";
import { seedLayers } from "../model/seed-rules";
import type {
  Category,
  EditableCompliance,
  LedgerEntry,
  Result,
  RuleSet,
  RuleSetView,
  SuspiciousReasonCode,
  SuspiciousReport,
  Ticket,
  TicketView,
} from "../model/types";
import { CATEGORIES } from "../model/types";
import type { Actor } from "~/shared/actor/actor";
import { canAppraise, canManageRules, canView } from "~/shared/actor/actor";

function nowIso(): string {
  return new Date().toISOString();
}

function seedRuleSets(): Map<number, RuleSet> {
  const ts = "2026-07-01T00:00:00.000Z";
  const layers = seedLayers();
  const v1: RuleSet = {
    version: 1,
    status: "active",
    label: "seed v1 (法定デモ既定)",
    createdAt: ts,
    updatedAt: ts,
    publishedAt: ts,
    parentVersion: null,
    editable: defaultEditable(),
    layers: structuredClone(layers),
  };
  return new Map([[1, v1]]);
}

let ruleSets = seedRuleSets();
let tickets = new Map<string, Ticket>();
let ledgers = new Map<string, LedgerEntry>();
let reports = new Map<string, SuspiciousReport>();
let ticketSeq = 1;
let lineSeq = 1;
let ledgerSeq = 1;
let reportSeq = 1;
let nextRuleVersion = 2;

export function resetSateiStore(): void {
  ruleSets = seedRuleSets();
  tickets = new Map();
  ledgers = new Map();
  reports = new Map();
  ticketSeq = 1;
  lineSeq = 1;
  ledgerSeq = 1;
  reportSeq = 1;
  nextRuleVersion = 2;
}

function activeRuleSet(): RuleSet {
  for (const rs of ruleSets.values()) {
    if (rs.status === "active") return rs;
  }
  throw new Error("no active RuleSet");
}

function getRuleSet(version: number): RuleSet | undefined {
  return ruleSets.get(version);
}

function viewOf(ticket: Ticket): TicketView {
  const rs = getRuleSet(ticket.ruleSetVersion);
  if (!rs) {
    throw new Error(`missing RuleSet v${ticket.ruleSetVersion}`);
  }
  const active = activeRuleSet();
  const plan = evaluate(ticket, rs, {
    activeRuleSetVersion: active.version,
  });
  const ticketReports = ticket.suspiciousReportIds
    .map((id) => reports.get(id))
    .filter((r): r is SuspiciousReport => !!r);
  const ledger = ticket.ledgerEntryId
    ? (ledgers.get(ticket.ledgerEntryId) ?? null)
    : null;
  return {
    ticket: structuredClone(ticket),
    plan,
    pinnedRuleSet: structuredClone(rs),
    reports: ticketReports,
    ledger: ledger ? structuredClone(ledger) : null,
  };
}

export function listTickets(actor: Actor): Ticket[] {
  if (!canView(actor)) return [];
  return [...tickets.values()]
    .map((t) => structuredClone(t))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTicketView(
  actor: Actor,
  id: string,
): Result<TicketView> {
  if (!canView(actor)) {
    return { ok: false, code: "forbidden", message: "閲覧権限がありません" };
  }
  const t = tickets.get(id);
  if (!t) return { ok: false, code: "not_found", message: "チケットがありません" };
  return { ok: true, value: viewOf(t) };
}

export function createTicket(
  actor: Actor,
  input: { channel: Ticket["channel"] },
): Result<TicketView> {
  if (!canAppraise(actor)) {
    return { ok: false, code: "forbidden", message: "査定権限がありません" };
  }
  const active = activeRuleSet();
  const id = `tk_${String(ticketSeq++).padStart(4, "0")}`;
  const ts = nowIso();
  const ticket: Ticket = {
    id,
    ownerActorId: actor.id,
    channel: input.channel,
    paymentMethod: undefined,
    seller: {},
    idCheck: { status: "pending" },
    aml: {},
    lines: [],
    ruleSetVersion: active.version,
    status: "open",
    suspiciousReportIds: [],
    createdAt: ts,
    updatedAt: ts,
  };
  tickets.set(id, ticket);
  return { ok: true, value: viewOf(ticket) };
}

export type TicketPatch = {
  channel?: Ticket["channel"];
  paymentMethod?: Ticket["paymentMethod"];
  seller?: Ticket["seller"];
  idCheck?: Partial<Ticket["idCheck"]>;
  aml?: Ticket["aml"];
  authenticity?: Ticket["authenticity"];
  lines?: {
    id?: string;
    category: Category;
    offerAmount: number;
    attrs?: Record<string, string | number | boolean | undefined>;
  }[];
};

export function patchTicket(
  actor: Actor,
  id: string,
  patch: TicketPatch,
): Result<TicketView> {
  if (!canAppraise(actor)) {
    return { ok: false, code: "forbidden", message: "査定権限がありません" };
  }
  const current = tickets.get(id);
  if (!current) {
    return { ok: false, code: "not_found", message: "チケットがありません" };
  }
  if (current.status !== "open") {
    return { ok: false, code: "not_open", message: "open 以外は編集できません" };
  }

  if (patch.channel) current.channel = patch.channel;
  if (patch.paymentMethod !== undefined) {
    current.paymentMethod = patch.paymentMethod;
  }
  if (patch.seller) {
    current.seller = { ...current.seller, ...patch.seller };
  }
  if (patch.idCheck) {
    current.idCheck = { ...current.idCheck, ...patch.idCheck };
  }
  if (patch.aml) {
    current.aml = { ...current.aml, ...patch.aml };
  }
  if (patch.authenticity !== undefined) {
    current.authenticity = patch.authenticity;
  }
  if (patch.lines) {
    current.lines = patch.lines.map((l) => {
      if (!CATEGORIES.includes(l.category)) {
        throw new Error(`invalid category ${l.category}`);
      }
      return {
        id: l.id ?? `ln_${lineSeq++}`,
        category: l.category,
        offerAmount: l.offerAmount,
        attrs: { ...(l.attrs ?? {}) },
      };
    });
  }

  current.updatedAt = nowIso();
  tickets.set(id, current);
  return { ok: true, value: viewOf(current) };
}

export function acceptTicket(
  actor: Actor,
  id: string,
): Result<TicketView> {
  if (!canAppraise(actor)) {
    return { ok: false, code: "forbidden", message: "査定権限がありません" };
  }
  const current = tickets.get(id);
  if (!current) {
    return { ok: false, code: "not_found", message: "チケットがありません" };
  }
  if (current.status === "accepted") {
    return {
      ok: false,
      code: "already_accepted",
      message: "既に成約済みです",
    };
  }
  if (current.status !== "open") {
    return { ok: false, code: "not_open", message: "open のみ成約できます" };
  }

  const rs = getRuleSet(current.ruleSetVersion);
  if (!rs) {
    return { ok: false, code: "not_found", message: "RuleSet がありません" };
  }
  const active = activeRuleSet();
  const plan = evaluate(current, rs, {
    activeRuleSetVersion: active.version,
  });

  if (!plan.computed.ledgerReady) {
    return {
      ok: false,
      code: "accept_blocked",
      message: "成約条件を満たしていません",
      blocks: plan.blocks,
    };
  }

  const acceptedAt = nowIso();
  const ledgerId = `lg_${String(ledgerSeq++).padStart(4, "0")}`;
  const ledger = projectLedger(current, plan, acceptedAt, ledgerId);
  ledgers.set(ledgerId, ledger);
  current.status = "accepted";
  current.ledgerEntryId = ledgerId;
  current.updatedAt = acceptedAt;
  tickets.set(id, current);
  return { ok: true, value: viewOf(current) };
}

export function repinRuleSet(
  actor: Actor,
  id: string,
): Result<TicketView> {
  if (!canAppraise(actor) && !canManageRules(actor)) {
    return { ok: false, code: "forbidden", message: "repin 権限がありません" };
  }
  const current = tickets.get(id);
  if (!current) {
    return { ok: false, code: "not_found", message: "チケットがありません" };
  }
  if (current.status !== "open") {
    return {
      ok: false,
      code: "not_open",
      message: "open のみ repin できます（accepted は拒否）",
    };
  }
  const active = activeRuleSet();
  current.ruleSetVersion = active.version;
  current.updatedAt = nowIso();
  tickets.set(id, current);
  return { ok: true, value: viewOf(current) };
}

export function reportSuspicious(
  actor: Actor,
  input: {
    ticketId: string;
    reasonCode: SuspiciousReasonCode;
    note: string;
  },
): Result<TicketView> {
  if (!canAppraise(actor)) {
    return { ok: false, code: "forbidden", message: "申告権限がありません" };
  }
  const current = tickets.get(input.ticketId);
  if (!current) {
    return { ok: false, code: "not_found", message: "チケットがありません" };
  }
  const note = input.note.trim();
  if (note.length < 5) {
    return {
      ok: false,
      code: "validation",
      message: "申告メモは5文字以上必要です",
    };
  }
  const id = `sr_${String(reportSeq++).padStart(4, "0")}`;
  const report: SuspiciousReport = {
    id,
    ticketId: current.id,
    reportedBy: actor.id,
    reportedAt: nowIso(),
    reasonCode: input.reasonCode,
    note,
    disposition: "recorded",
  };
  reports.set(id, report);
  current.suspiciousReportIds = [...current.suspiciousReportIds, id];
  current.updatedAt = nowIso();
  tickets.set(current.id, current);
  return { ok: true, value: viewOf(current) };
}

function toRuleSetView(rs: RuleSet): RuleSetView {
  const parent =
    rs.parentVersion != null
      ? (ruleSets.get(rs.parentVersion) ?? null)
      : null;
  const diffs = parent
    ? diffEditable(parent.editable, rs.editable)
    : [];
  const openTicketsOnThisVersion = [...tickets.values()].filter(
    (t) => t.status === "open" && t.ruleSetVersion === rs.version,
  ).length;
  return {
    ruleSet: structuredClone(rs),
    parent: parent ? structuredClone(parent) : null,
    diffs,
    impact: previewComplianceImpact(rs.editable),
    openTicketsOnThisVersion,
    isActive: rs.status === "active",
  };
}

export function listRuleSets(actor: Actor): RuleSet[] {
  if (!canView(actor)) return [];
  return [...ruleSets.values()]
    .map((r) => structuredClone(r))
    .sort((a, b) => b.version - a.version);
}

export function getRuleSetView(
  actor: Actor,
  version: number,
): Result<RuleSetView> {
  if (!canView(actor)) {
    return { ok: false, code: "forbidden", message: "閲覧権限がありません" };
  }
  const rs = ruleSets.get(version);
  if (!rs) return { ok: false, code: "not_found", message: "RuleSet なし" };
  return { ok: true, value: toRuleSetView(rs) };
}

/** Clone from active by default, or from a specific source version. */
export function cloneRuleSet(
  actor: Actor,
  sourceVersion?: number,
): Result<RuleSetView> {
  if (!canManageRules(actor)) {
    return { ok: false, code: "forbidden", message: "CMS 権限がありません" };
  }
  const source =
    sourceVersion != null
      ? ruleSets.get(sourceVersion)
      : activeRuleSet();
  if (!source) {
    return { ok: false, code: "not_found", message: "複製元 RuleSet なし" };
  }
  const version = nextRuleVersion++;
  const ts = nowIso();
  const draft: RuleSet = {
    version,
    status: "draft",
    label: `draft from v${source.version}`,
    createdAt: ts,
    updatedAt: ts,
    publishedAt: null,
    parentVersion: source.version,
    editable: structuredClone(source.editable),
    layers: structuredClone(source.layers),
  };
  ruleSets.set(version, draft);
  return { ok: true, value: toRuleSetView(draft) };
}

export function updateRuleSetDraft(
  actor: Actor,
  version: number,
  input: {
    editable: EditableCompliance;
    label?: string;
  },
): Result<RuleSetView> {
  if (!canManageRules(actor)) {
    return { ok: false, code: "forbidden", message: "CMS 権限がありません" };
  }
  const rs = ruleSets.get(version);
  if (!rs) return { ok: false, code: "not_found", message: "RuleSet なし" };
  if (rs.status !== "draft") {
    return {
      ok: false,
      code: "validation",
      message: "draft のみ編集できます",
    };
  }
  const parsed = parseEditable(input.editable);
  if (!parsed.ok) {
    const msg = Object.values(parsed.fieldErrors).filter(Boolean).join("; ");
    return { ok: false, code: "validation", message: msg || "validation" };
  }
  rs.editable = parsed.value;
  if (input.label !== undefined) {
    rs.label = input.label.trim().slice(0, 80);
  }
  rs.updatedAt = nowIso();
  ruleSets.set(version, rs);
  return { ok: true, value: toRuleSetView(rs) };
}

export function discardRuleSetDraft(
  actor: Actor,
  version: number,
): Result<{ discarded: number }> {
  if (!canManageRules(actor)) {
    return { ok: false, code: "forbidden", message: "CMS 権限がありません" };
  }
  const rs = ruleSets.get(version);
  if (!rs) return { ok: false, code: "not_found", message: "RuleSet なし" };
  if (rs.status !== "draft") {
    return {
      ok: false,
      code: "validation",
      message: "draft のみ破棄できます",
    };
  }
  ruleSets.delete(version);
  return { ok: true, value: { discarded: version } };
}

export function publishRuleSet(
  actor: Actor,
  version: number,
): Result<RuleSetView> {
  if (!canManageRules(actor)) {
    return { ok: false, code: "forbidden", message: "CMS 権限がありません" };
  }
  const rs = ruleSets.get(version);
  if (!rs) return { ok: false, code: "not_found", message: "RuleSet なし" };
  if (rs.status !== "draft") {
    return {
      ok: false,
      code: "validation",
      message: "draft のみ publish できます",
    };
  }
  // Re-validate before publish
  const parsed = parseEditable(rs.editable);
  if (!parsed.ok) {
    return {
      ok: false,
      code: "validation",
      message: "publish 前に editable が不正です",
    };
  }
  const ts = nowIso();
  for (const other of ruleSets.values()) {
    if (other.status === "active") {
      other.status = "retired";
      other.updatedAt = ts;
    }
  }
  rs.status = "active";
  rs.publishedAt = ts;
  rs.updatedAt = ts;
  if (!rs.label || rs.label.startsWith("draft from")) {
    rs.label = `active v${rs.version}`;
  }
  ruleSets.set(version, rs);
  return { ok: true, value: toRuleSetView(rs) };
}

export function listReports(actor: Actor): SuspiciousReport[] {
  if (!canView(actor)) return [];
  return [...reports.values()]
    .map((r) => structuredClone(r))
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}
