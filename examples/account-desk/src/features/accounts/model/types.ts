export const ACCOUNT_STATUSES = ["prospect", "active", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const SEGMENTS = ["enterprise", "mid", "smb", "public"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const CURRENCIES = ["JPY", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ADDRESS_ROLES = ["hq", "bill_to", "ship_to"] as const;
export type AddressRole = (typeof ADDRESS_ROLES)[number];

export const CONTACT_ROLES = [
  "primary",
  "billing",
  "operations",
  "other",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export type Address = {
  id: string;
  role: AddressRole;
  isDefaultForRole: boolean;
  label?: string;
  postalCode?: string;
  prefecture?: string;
  line1: string;
  line2?: string;
  countryCode: string;
};

export type Contact = {
  id: string;
  role: ContactRole;
  name: string;
  nameKana?: string;
  email?: string;
  phone?: string;
  department?: string;
  isPrimary: boolean;
};

export type Account = {
  id: string;
  code: string;
  legalName: string;
  nameKana?: string;
  tradeName?: string;
  status: AccountStatus;
  statusReason?: string;
  creditHold: boolean;
  creditHoldReason?: string;
  tradeSuspended: boolean;
  tradeSuspendReason?: string;
  ownerId: string;
  parentAccountId?: string;
  segment: Segment;
  tags: string[];
  industry?: string;
  countryCode: string;
  timezone?: string;
  taxId?: string;
  currency: Currency;
  creditLimit: number;
  paymentTermsDays: number;
  invoiceEmail?: string;
  alertNote?: string;
  internalMemo?: string;
  addresses: Address[];
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

export type AccountOpsSummary = {
  accountId: string;
  openOrderCount: number;
  openOrderAmount: number;
  overdueInvoiceCount: number;
  overdueAmount: number;
  accruedReceivables: number;
  lastOrderAt?: string;
  lastPaymentAt?: string;
};

export type AccountEvent = {
  id: string;
  accountId: string;
  at: string;
  actorId: string;
  kind:
    | "created"
    | "updated"
    | "status_changed"
    | "credit_hold_changed"
    | "note";
  summary: string;
};

export type ReadinessIssueCode =
  | "missing_tax_id"
  | "missing_bill_to"
  | "missing_ship_to"
  | "no_contact"
  | "no_primary_contact"
  | "missing_invoice_email"
  | "credit_hold_without_reason"
  | "active_without_bill_to"
  | "suspended_without_reason";

export type ReadinessIssue = {
  code: ReadinessIssueCode;
  message: string;
  section:
    | "basics"
    | "commercial"
    | "addresses"
    | "contacts"
    | "notes";
};

export type AccountReadiness = {
  ready: boolean;
  issues: ReadinessIssue[];
};

export type AccountListItem = {
  account: Account;
  readiness: AccountReadiness;
  ops: AccountOpsSummary;
  parentTradeName?: string;
  ownerLabel: string;
  displayName: string;
  availableCredit: number;
};

export type AccountDetail = AccountListItem & {
  children: { id: string; code: string; displayName: string; status: AccountStatus }[];
  events: AccountEvent[];
};

export type ListQuery = {
  q?: string;
  status?: AccountStatus | "";
  ownerId?: string;
  segment?: Segment | "";
  incomplete?: boolean;
  creditHold?: boolean;
  sort?: "name" | "updatedAt" | "code";
  page?: number;
  pageSize?: number;
};

export type ListResult = {
  items: AccountListItem[];
  total: number;
  page: number;
  pageSize: number;
  emptyKind: "data" | "empty" | "zero";
};

export const OWNERS = {
  alice: "山田 太郎",
  bob: "佐藤 花子",
  carol: "鈴木 一郎",
} as const;

export type OwnerId = keyof typeof OWNERS;

export const PAGE_SIZE = 20;
