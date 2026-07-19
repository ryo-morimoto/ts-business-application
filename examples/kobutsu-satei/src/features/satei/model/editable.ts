import type {
  Category,
  ComplianceScenarioPreview,
  EditableCompliance,
  EditableDiff,
  EditableKey,
} from "./types";
import { CATEGORIES } from "./types";
import { computeCompliance } from "./evaluate";
import type { Ticket } from "./types";

export type EditableValidation =
  | { ok: true; value: EditableCompliance }
  | { ok: false; fieldErrors: Partial<Record<EditableKey | "root", string>> };

function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

/** Normalize + validate CMS M keys. Integers, unique categories, non-negative. */
export function parseEditable(input: {
  identityThresholdYen: number;
  alwaysIdCategories: string[];
  forceIdentityAll: boolean;
  amlCashThresholdYen: number;
}): EditableValidation {
  const fieldErrors: Partial<Record<EditableKey | "root", string>> = {};

  if (
    !Number.isFinite(input.identityThresholdYen) ||
    !Number.isInteger(input.identityThresholdYen)
  ) {
    fieldErrors.identityThresholdYen = "整数で入力してください";
  } else if (input.identityThresholdYen < 0) {
    fieldErrors.identityThresholdYen = "0以上である必要があります";
  }

  if (
    !Number.isFinite(input.amlCashThresholdYen) ||
    !Number.isInteger(input.amlCashThresholdYen)
  ) {
    fieldErrors.amlCashThresholdYen = "整数で入力してください";
  } else if (input.amlCashThresholdYen < 0) {
    fieldErrors.amlCashThresholdYen = "0以上である必要があります";
  }

  const cats: Category[] = [];
  const seen = new Set<string>();
  for (const c of input.alwaysIdCategories) {
    if (!isCategory(c)) {
      fieldErrors.alwaysIdCategories = `未知のカテゴリ: ${c}`;
      break;
    }
    if (seen.has(c)) continue;
    seen.add(c);
    cats.push(c);
  }

  if (typeof input.forceIdentityAll !== "boolean") {
    fieldErrors.forceIdentityAll = "真偽値が必要です";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      identityThresholdYen: input.identityThresholdYen,
      alwaysIdCategories: cats,
      forceIdentityAll: input.forceIdentityAll,
      amlCashThresholdYen: input.amlCashThresholdYen,
    },
  };
}

export function formatEditableValue(
  key: EditableKey,
  editable: EditableCompliance,
): string {
  switch (key) {
    case "identityThresholdYen":
      return String(editable.identityThresholdYen);
    case "amlCashThresholdYen":
      return String(editable.amlCashThresholdYen);
    case "forceIdentityAll":
      return String(editable.forceIdentityAll);
    case "alwaysIdCategories":
      return editable.alwaysIdCategories.length
        ? [...editable.alwaysIdCategories].sort().join(",")
        : "(none)";
  }
}

export function diffEditable(
  from: EditableCompliance,
  to: EditableCompliance,
): EditableDiff[] {
  const keys: EditableKey[] = [
    "identityThresholdYen",
    "alwaysIdCategories",
    "forceIdentityAll",
    "amlCashThresholdYen",
  ];
  const out: EditableDiff[] = [];
  for (const key of keys) {
    const a = formatEditableValue(key, from);
    const b = formatEditableValue(key, to);
    if (a !== b) out.push({ key, from: a, to: b });
  }
  return out;
}

function stubTicket(
  over: Partial<Ticket> & Pick<Ticket, "lines" | "paymentMethod">,
): Ticket {
  return {
    id: "preview",
    ownerActorId: "preview",
    channel: "store",
    seller: {},
    idCheck: { status: "pending" },
    aml: {},
    ruleSetVersion: 0,
    status: "open",
    suspiciousReportIds: [],
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

/** Scenario matrix for CMS impact panel (teaching). */
export function previewComplianceImpact(
  editable: EditableCompliance,
): ComplianceScenarioPreview[] {
  const scenarios: { id: string; label: string; ticket: Ticket }[] = [
    {
      id: "apparel_8k",
      label: "衣類 8,000円 (transfer)",
      ticket: stubTicket({
        paymentMethod: "transfer",
        lines: [
          {
            id: "1",
            category: "apparel",
            offerAmount: 8000,
            attrs: {},
          },
        ],
      }),
    },
    {
      id: "game_3k",
      label: "ゲームソフト 3,000円",
      ticket: stubTicket({
        paymentMethod: "transfer",
        lines: [
          {
            id: "1",
            category: "game_soft",
            offerAmount: 3000,
            attrs: {},
          },
        ],
      }),
    },
    {
      id: "ac_5k",
      label: "室外機 5,000円",
      ticket: stubTicket({
        paymentMethod: "transfer",
        lines: [
          {
            id: "1",
            category: "ac_outdoor",
            offerAmount: 5000,
            attrs: {},
          },
        ],
      }),
    },
    {
      id: "watch_cash_2_5m",
      label: "時計・宝飾 現金 2,500,000円",
      ticket: stubTicket({
        paymentMethod: "cash",
        lines: [
          {
            id: "1",
            category: "watch_jewelry",
            offerAmount: 2_500_000,
            attrs: {},
          },
        ],
      }),
    },
  ];

  return scenarios.map((s) => {
    const c = computeCompliance(s.ticket, editable);
    return {
      id: s.id,
      label: s.label,
      needIdentity: c.needIdentity,
      needAml: c.needAml,
    };
  });
}
