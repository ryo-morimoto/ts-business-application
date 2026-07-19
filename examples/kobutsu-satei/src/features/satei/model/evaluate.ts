import { allCategoryOptions } from "./seed-rules";
import { getFieldValue, isBlank } from "./ticket-paths";
import type {
  AppraisalRule,
  BlockReason,
  EditableCompliance,
  FormFieldPlan,
  FormPlan,
  FormPlanComputed,
  LineItem,
  RuleSet,
  Ticket,
} from "./types";
import { CATEGORIES } from "./types";

export function defaultEditable(): EditableCompliance {
  return {
    identityThresholdYen: 10_000,
    alwaysIdCategories: ["game_soft", "ac_outdoor"],
    forceIdentityAll: false,
    amlCashThresholdYen: 2_000_000,
  };
}

/** L2 compliance computed from editable keys + ticket values. */
export function computeCompliance(
  ticket: Ticket,
  editable: EditableCompliance,
): Pick<FormPlanComputed, "totalAmount" | "needIdentity" | "needAml"> {
  const totalAmount = ticket.lines.reduce(
    (s, l) => s + (Number.isFinite(l.offerAmount) ? l.offerAmount : 0),
    0,
  );

  const alwaysIdItem = ticket.lines.some((l) =>
    editable.alwaysIdCategories.includes(l.category),
  );

  const needIdentity =
    editable.forceIdentityAll ||
    totalAmount >= editable.identityThresholdYen ||
    alwaysIdItem;

  const hasJewelry = ticket.lines.some((l) => l.category === "watch_jewelry");
  const needAml =
    hasJewelry &&
    ticket.paymentMethod === "cash" &&
    totalAmount > editable.amlCashThresholdYen;

  return { totalAmount, needIdentity, needAml };
}

export type EvaluateOptions = {
  activeRuleSetVersion: number;
};

function lineAttr(line: LineItem, key: string): unknown {
  return line.attrs[key];
}

function applyAppraisalRules(
  ticket: Ticket,
  rules: AppraisalRule[],
  fields: FormFieldPlan[],
): { buyable: boolean; blocks: BlockReason[] } {
  const blocks: BlockReason[] = [];
  let buyable = true;

  const needsAuth = ticket.lines.some((l) => {
    // authenticity required if any line category says so — checked via catalog elsewhere
    return true;
  });
  // refine: only categories that require authenticity
  void needsAuth;

  for (const rule of rules) {
    switch (rule.type) {
      case "block_if_authenticity": {
        if (
          ticket.authenticity &&
          rule.values.includes(ticket.authenticity)
        ) {
          buyable = false;
          blocks.push({ code: rule.code, message: rule.message });
        }
        break;
      }
      case "block_if_line_attr": {
        for (const line of ticket.lines) {
          if (line.category !== rule.category) continue;
          if (lineAttr(line, rule.attr) === rule.equals) {
            buyable = false;
            blocks.push({
              code: rule.code,
              message: `明細 ${line.id}: ${rule.message}`,
            });
          }
        }
        break;
      }
      case "require_attr_if_missing": {
        for (const line of ticket.lines) {
          if (line.category !== rule.category) continue;
          if (isBlank(lineAttr(line, rule.whenAttrMissing))) {
            const f = fields.find(
              (x) => x.lineId === line.id && x.id === rule.thenRequire,
            );
            if (f) f.required = true;
          }
        }
        break;
      }
      case "require_offer_positive": {
        for (const line of ticket.lines) {
          if (!(line.offerAmount > 0)) {
            buyable = false;
            blocks.push({
              code: rule.code,
              message: `明細 ${line.id}: ${rule.message}`,
            });
          }
        }
        break;
      }
    }
  }

  return { buyable, blocks };
}

/**
 * Multi-layer evaluate: catalog → compliance → appraisal.
 * Same function drives UI FormPlan and server accept gates.
 * All field defs / appraisal gates come from ruleSet.layers (pinned).
 */
export function evaluate(
  ticket: Ticket,
  ruleSet: RuleSet,
  options: EvaluateOptions,
): FormPlan {
  const fields: FormFieldPlan[] = [];
  const blocks: BlockReason[] = [];
  const { catalog, appraisal } = ruleSet.layers;

  // —— L1 catalog: ticket + per-line fields from pinned catalog ——
  fields.push({
    id: "channel",
    label: "チャネル",
    kind: "select",
    visible: true,
    required: true,
    group: "ticket",
    options: [
      { value: "store", label: "店頭" },
      { value: "mail_in", label: "宅配" },
    ],
  });
  fields.push({
    id: "paymentMethod",
    label: "支払方法",
    kind: "select",
    visible: true,
    required: true,
    group: "ticket",
    options: [
      { value: "cash", label: "現金" },
      { value: "transfer", label: "振込" },
    ],
  });

  if (ticket.lines.length === 0) {
    blocks.push({
      code: "no_lines",
      message: "明細が1行以上必要です",
    });
  }

  let anyRequiresAuth = false;

  for (const line of ticket.lines) {
    if (!CATEGORIES.includes(line.category)) {
      blocks.push({
        code: "unknown_category",
        message: `取扱対象外のカテゴリ: ${line.category}`,
      });
      continue;
    }

    const catDef = catalog.categories[line.category];
    if (!catDef) {
      blocks.push({
        code: "unknown_category",
        message: `カタログに無いカテゴリ: ${line.category}`,
      });
      continue;
    }

    if (catDef.requiresAuthenticity) anyRequiresAuth = true;

    fields.push({
      id: "category",
      label: "品目カテゴリ",
      kind: "select",
      visible: true,
      required: true,
      group: "line",
      lineId: line.id,
      options: allCategoryOptions(),
    });

    fields.push({
      id: "offerAmount",
      label: "買取提示額(円)",
      kind: "number",
      visible: true,
      required: true,
      min: 1,
      group: "line",
      lineId: line.id,
    });

    for (const def of catDef.fields) {
      fields.push({
        id: def.id,
        label: def.label,
        kind: def.kind,
        visible: true,
        required: def.required,
        options: def.options,
        min: def.min,
        group: "line",
        lineId: line.id,
      });
    }
  }

  if (anyRequiresAuth) {
    fields.push({
      id: "authenticity",
      label: "真贋/基準判定",
      kind: "select",
      visible: true,
      required: true,
      group: "appraisal",
      options: [
        { value: "pass", label: "基準内 (pass)" },
        { value: "hold", label: "保留 (hold)" },
        { value: "reject", label: "買取基準外 (reject)" },
      ],
    });
  }

  // —— L2 compliance (CMS M editable) ——
  const { totalAmount, needIdentity, needAml } = computeCompliance(
    ticket,
    ruleSet.editable,
  );

  if (needIdentity) {
    for (const [id, label] of [
      ["seller.name", "氏名"],
      ["seller.address", "住所"],
      ["seller.occupation", "職業"],
      ["seller.age", "年齢"],
    ] as const) {
      fields.push({
        id,
        label,
        kind: "text",
        visible: true,
        required: true,
        group: "seller",
      });
    }
    fields.push({
      id: "idCheck.status",
      label: "本人確認ステータス",
      kind: "select",
      visible: true,
      required: true,
      group: "idCheck",
      options: [
        { value: "pending", label: "未完了" },
        { value: "complete", label: "完了 (stub)" },
      ],
    });
    fields.push({
      id: "idCheck.docType",
      label: "確認書類",
      kind: "select",
      visible: true,
      required: true,
      group: "idCheck",
      options: [
        { value: "drivers_license", label: "運転免許証" },
        { value: "my_number_card", label: "マイナンバーカード" },
        { value: "other", label: "その他" },
      ],
    });
    fields.push({
      id: "idCheck.method",
      label: "確認措置",
      kind: "text",
      visible: ticket.channel === "store",
      required: ticket.channel === "store",
      group: "idCheck",
    });
    fields.push({
      id: "idCheck.remoteIdMethod",
      label: "非対面確認方式",
      kind: "select",
      visible: ticket.channel === "mail_in",
      required: ticket.channel === "mail_in",
      group: "idCheck",
      options: [
        { value: "ekyc_stub", label: "eKYC (stub)" },
        { value: "mail_docs", label: "書類郵送 (stub)" },
      ],
    });
  }

  if (needAml) {
    fields.push({
      id: "aml.purpose",
      label: "取引目的 (犯収法デモ)",
      kind: "text",
      visible: true,
      required: true,
      group: "aml",
    });
  }

  // —— L3 appraisal from pinned rules ——
  if (anyRequiresAuth && isBlank(ticket.authenticity)) {
    blocks.push({
      code: "authenticity_required",
      message: "真贋/基準判定が未入力です",
    });
  }

  const appraisalResult = applyAppraisalRules(ticket, appraisal, fields);
  for (const b of appraisalResult.blocks) blocks.push(b);
  let buyable = appraisalResult.buyable;
  if (anyRequiresAuth && isBlank(ticket.authenticity)) {
    buyable = false;
  }

  // Required field completeness
  const missingRequired: string[] = [];
  for (const f of fields) {
    if (!f.visible || !f.required) continue;
    const v = getFieldValue(ticket, f.id, f.lineId);
    if (f.kind === "boolean") {
      if (v !== true && v !== false) {
        missingRequired.push(f.lineId ? `${f.lineId}.${f.id}` : f.id);
      }
    } else if (f.kind === "number" && f.min != null) {
      if (typeof v !== "number" || v < f.min) {
        missingRequired.push(f.lineId ? `${f.lineId}.${f.id}` : f.id);
      }
    } else if (isBlank(v)) {
      missingRequired.push(f.lineId ? `${f.lineId}.${f.id}` : f.id);
    }
  }

  if (needIdentity && ticket.idCheck.status !== "complete") {
    missingRequired.push("idCheck.status=complete");
  }

  if (missingRequired.length > 0) {
    blocks.push({
      code: "missing_required",
      message: `必須未充足: ${missingRequired.slice(0, 8).join(", ")}${missingRequired.length > 8 ? "…" : ""}`,
    });
  }

  const hardBlockCodes = new Set([
    "authenticity_reject",
    "authenticity_hold",
    "authenticity_required",
    "apparel_unusable",
    "unknown_category",
    "no_lines",
    "offer_not_positive",
  ]);

  const hasHardBlock = blocks.some((b) => hardBlockCodes.has(b.code));
  const ledgerReady =
    buyable &&
    !hasHardBlock &&
    missingRequired.length === 0 &&
    ticket.lines.length > 0;

  const computed: FormPlanComputed = {
    totalAmount,
    needIdentity,
    needAml,
    buyable: buyable && !hasHardBlock,
    ledgerReady,
    activeRuleSetVersion: options.activeRuleSetVersion,
    pinnedRuleSetVersion: ticket.ruleSetVersion,
    pinStale: ticket.ruleSetVersion !== options.activeRuleSetVersion,
  };

  return { fields, computed, blocks };
}

/** Build ledger projection when accept is allowed. */
export function projectLedger(
  ticket: Ticket,
  plan: FormPlan,
  acceptedAt: string,
  ledgerId: string,
): {
  id: string;
  ticketId: string;
  ruleSetVersion: number;
  acceptedAt: string;
  tradeDate: string;
  itemsSummary: string;
  features: string;
  sellerName: string;
  sellerAddress: string;
  sellerOccupation: string;
  sellerAge: string;
  idCheckMeasure: string;
  totalAmount: number;
} {
  const itemsSummary = ticket.lines
    .map((l) => `${l.category}×1 @${l.offerAmount}`)
    .join("; ");
  const features = ticket.lines
    .map((l) => {
      const parts = Object.entries(l.attrs)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${String(v)}`);
      return `${l.id}:{${parts.join(",")}}`;
    })
    .join(" | ");

  const measure = plan.computed.needIdentity
    ? [
        ticket.idCheck.docType ?? "unknown_doc",
        ticket.channel === "mail_in"
          ? ticket.idCheck.remoteIdMethod
          : ticket.idCheck.method,
      ]
        .filter(Boolean)
        .join(" / ")
    : "exempt_under_threshold";

  return {
    id: ledgerId,
    ticketId: ticket.id,
    ruleSetVersion: ticket.ruleSetVersion,
    acceptedAt,
    tradeDate: acceptedAt.slice(0, 10),
    itemsSummary,
    features,
    sellerName: ticket.seller.name ?? "",
    sellerAddress: ticket.seller.address ?? "",
    sellerOccupation: ticket.seller.occupation ?? "",
    sellerAge: ticket.seller.age ?? "",
    idCheckMeasure: measure,
    totalAmount: plan.computed.totalAmount,
  };
}
