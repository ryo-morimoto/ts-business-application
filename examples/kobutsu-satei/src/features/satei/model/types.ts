/** Teaching domain types for kobutsu appraisal. Not legal advice. */

export const CATEGORIES = [
  "game_soft",
  "apparel",
  "watch_jewelry",
  "ac_outdoor",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CHANNELS = ["store", "mail_in"] as const;
export type Channel = (typeof CHANNELS)[number];

export const PAYMENT_METHODS = ["cash", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const AUTHENTICITY = ["pass", "hold", "reject"] as const;
export type Authenticity = (typeof AUTHENTICITY)[number];

export type EditableCompliance = {
  identityThresholdYen: number;
  alwaysIdCategories: Category[];
  forceIdentityAll: boolean;
  amlCashThresholdYen: number;
};

/** CMS-editable keys only (M). Catalog/appraisal remain seed-fixed. */
export const EDITABLE_KEYS = [
  "identityThresholdYen",
  "alwaysIdCategories",
  "forceIdentityAll",
  "amlCashThresholdYen",
] as const;
export type EditableKey = (typeof EDITABLE_KEYS)[number];

export type RuleSetStatus = "draft" | "active" | "retired";

export type SelectOption = { value: string; label: string };

export type FieldKind =
  | "text"
  | "number"
  | "select"
  | "boolean"
  | "textarea";

export type CatalogFieldDef = {
  id: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  options?: SelectOption[];
  min?: number;
};

export type CatalogCategoryDef = {
  label: string;
  /** When true, ticket-level authenticity is required. */
  requiresAuthenticity: boolean;
  fields: CatalogFieldDef[];
};

export type CatalogLayer = {
  categories: Record<Category, CatalogCategoryDef>;
};

/**
 * Declarative appraisal rules (seed-fixed, cloned with RuleSet).
 * CMS M does not edit these in the UI.
 */
export type AppraisalRule =
  | {
      type: "block_if_authenticity";
      values: Authenticity[];
      code: string;
      message: string;
    }
  | {
      type: "block_if_line_attr";
      category: Category;
      attr: string;
      equals: string | number | boolean;
      code: string;
      message: string;
    }
  | {
      type: "require_attr_if_missing";
      category: Category;
      whenAttrMissing: string;
      thenRequire: string;
      code: string;
      message: string;
    }
  | {
      type: "require_offer_positive";
      code: string;
      message: string;
    };

export type RuleLayers = {
  catalog: CatalogLayer;
  appraisal: AppraisalRule[];
};

export type RuleSet = {
  version: number;
  status: RuleSetStatus;
  /** Short human label for CMS list (optional). */
  label: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  parentVersion: number | null;
  /** CMS M keys (compliance). */
  editable: EditableCompliance;
  /** Full frozen package: catalog + appraisal (not CMS M editable). */
  layers: RuleLayers;
};

export type EditableDiff = {
  key: EditableKey;
  from: string;
  to: string;
};

export type ComplianceScenarioPreview = {
  id: string;
  label: string;
  needIdentity: boolean;
  needAml: boolean;
};

export type RuleSetView = {
  ruleSet: RuleSet;
  parent: RuleSet | null;
  /** Diff of editable keys vs parent (or empty if no parent). */
  diffs: EditableDiff[];
  /** Teaching preview of how keys affect common scenarios. */
  impact: ComplianceScenarioPreview[];
  openTicketsOnThisVersion: number;
  isActive: boolean;
};

export type Seller = {
  name?: string;
  address?: string;
  occupation?: string;
  age?: string;
};

export type IdCheck = {
  status: "pending" | "complete";
  method?: string;
  docType?: string;
  remoteIdMethod?: string;
};

export type LineItem = {
  id: string;
  category: Category;
  offerAmount: number;
  /** Category-specific attrs (title, serial, condition, …) */
  attrs: Record<string, string | number | boolean | undefined>;
};

export type TicketStatus = "open" | "accepted" | "closed_without_accept";

export type Ticket = {
  id: string;
  ownerActorId: string;
  channel: Channel;
  paymentMethod?: PaymentMethod;
  seller: Seller;
  idCheck: IdCheck;
  aml: { purpose?: string };
  lines: LineItem[];
  /** Ticket-level authenticity (mainly watch_jewelry / brand risk). */
  authenticity?: Authenticity;
  ruleSetVersion: number;
  status: TicketStatus;
  ledgerEntryId?: string;
  suspiciousReportIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type FormFieldPlan = {
  id: string;
  label: string;
  kind: FieldKind;
  visible: boolean;
  required: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  /** Hint for UI grouping */
  group: "ticket" | "seller" | "idCheck" | "aml" | "line" | "appraisal";
  lineId?: string;
  /** For number fields */
  min?: number;
};

export type BlockReason = {
  code: string;
  message: string;
};

export type FormPlanComputed = {
  totalAmount: number;
  needIdentity: boolean;
  needAml: boolean;
  buyable: boolean;
  ledgerReady: boolean;
  activeRuleSetVersion: number;
  pinnedRuleSetVersion: number;
  pinStale: boolean;
};

export type FormPlan = {
  fields: FormFieldPlan[];
  computed: FormPlanComputed;
  blocks: BlockReason[];
};

export type LedgerEntry = {
  id: string;
  ticketId: string;
  ruleSetVersion: number;
  acceptedAt: string;
  tradeDate: string;
  /** 品目・数量 */
  itemsSummary: string;
  /** 特徴 */
  features: string;
  sellerName: string;
  sellerAddress: string;
  sellerOccupation: string;
  sellerAge: string;
  idCheckMeasure: string;
  totalAmount: number;
};

export type SuspiciousReasonCode =
  | "suspected_stolen"
  | "serial_tamper"
  | "other";

export type SuspiciousReport = {
  id: string;
  ticketId: string;
  reportedBy: string;
  reportedAt: string;
  reasonCode: SuspiciousReasonCode;
  note: string;
  disposition: "recorded";
};

export type TicketView = {
  ticket: Ticket;
  plan: FormPlan;
  /** Pinned RuleSet used for evaluate (client may re-run evaluate for draft preview). */
  pinnedRuleSet: RuleSet;
  reports: SuspiciousReport[];
  ledger: LedgerEntry | null;
};

export type ErrCode =
  | "forbidden"
  | "not_found"
  | "not_open"
  | "accept_blocked"
  | "validation"
  | "already_accepted";

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: ErrCode; message: string; blocks?: BlockReason[] };
