import { filterSortPage, toListItem } from "../model/filter";
import { computeReadiness } from "../model/readiness";
import { accountWriteSchema, type AccountWriteInput } from "../model/schemas";
import { buildSeed } from "../model/seed";
import type {
  Account,
  AccountDetail,
  AccountEvent,
  AccountOpsSummary,
  ListQuery,
  ListResult,
} from "../model/types";
import type { Actor } from "~/shared/actor/actor";

type Store = {
  accounts: Map<string, Account>;
  ops: Map<string, AccountOpsSummary>;
  events: AccountEvent[];
  seq: number;
};

function freshStore(): Store {
  const seed = buildSeed();
  return {
    accounts: new Map(seed.accounts.map((a) => [a.id, a])),
    ops: new Map(seed.ops.map((o) => [o.accountId, o])),
    events: [...seed.events],
    seq: 1000,
  };
}

let store: Store = freshStore();

function nextId(prefix: string): string {
  store.seq += 1;
  return `${prefix}_${store.seq}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureAddressDefaults(addresses: Account["addresses"]): Account["addresses"] {
  const byRole = new Map<string, Account["addresses"]>();
  for (const a of addresses) {
    const list = byRole.get(a.role) ?? [];
    list.push(a);
    byRole.set(a.role, list);
  }
  return addresses.map((a) => {
    const peers = byRole.get(a.role) ?? [a];
    if (peers.length === 1) {
      return { ...a, isDefaultForRole: true };
    }
    return a;
  });
}

function normalizeWrite(
  input: AccountWriteInput,
  existing: Account | null,
  actor: Actor,
): Account {
  const id = existing?.id ?? nextId("acc");
  const addresses = ensureAddressDefaults(
    input.addresses.map((a) => ({
      id: a.id && a.id.length > 0 ? a.id : nextId("addr"),
      role: a.role,
      isDefaultForRole: a.isDefaultForRole,
      label: a.label,
      postalCode: a.postalCode,
      prefecture: a.prefecture,
      line1: a.line1,
      line2: a.line2,
      countryCode: a.countryCode,
    })),
  );
  const contacts = input.contacts.map((c) => ({
    id: c.id && c.id.length > 0 ? c.id : nextId("ct"),
    role: c.role,
    name: c.name,
    nameKana: c.nameKana,
    email: c.email || undefined,
    phone: c.phone,
    department: c.department,
    isPrimary: c.isPrimary,
  }));

  return {
    id,
    code: existing ? existing.code : input.code,
    legalName: input.legalName,
    nameKana: input.nameKana,
    tradeName: input.tradeName,
    status: input.status,
    statusReason: input.statusReason,
    creditHold: input.creditHold,
    creditHoldReason: input.creditHoldReason,
    tradeSuspended: input.tradeSuspended,
    tradeSuspendReason: input.tradeSuspendReason,
    ownerId: input.ownerId,
    parentAccountId: input.parentAccountId || undefined,
    segment: input.segment,
    tags: input.tags,
    industry: input.industry,
    countryCode: input.countryCode,
    timezone: input.timezone,
    taxId: input.taxId,
    currency: input.currency,
    creditLimit: input.creditLimit,
    paymentTermsDays: input.paymentTermsDays,
    invoiceEmail: input.invoiceEmail || undefined,
    alertNote: input.alertNote,
    internalMemo: input.internalMemo,
    addresses,
    contacts,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    updatedBy: actor.id,
  };
}

export type MutationResult =
  | { ok: true; account: Account }
  | {
      ok: false;
      code: "forbidden" | "not_found" | "validation" | "conflict";
      message: string;
      fieldErrors?: { path: string; message: string }[];
    };

export function resetAccountStore(): void {
  store = freshStore();
}

export function listAccounts(query: ListQuery): ListResult {
  return filterSortPage(
    [...store.accounts.values()],
    store.ops,
    query,
  );
}

export function getAccountDetail(id: string): AccountDetail | null {
  const account = store.accounts.get(id);
  if (!account) return null;
  const ops = store.ops.get(id) ?? {
    accountId: id,
    openOrderCount: 0,
    openOrderAmount: 0,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 0,
  };
  const parentById = store.accounts;
  const item = toListItem(account, ops, parentById);
  const children = [...store.accounts.values()]
    .filter((a) => a.parentAccountId === id)
    .map((a) => ({
      id: a.id,
      code: a.code,
      displayName: a.tradeName || a.legalName,
      status: a.status,
    }));
  const events = store.events
    .filter((e) => e.accountId === id)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);
  return { ...item, children, events };
}

export function createAccount(
  actor: Actor,
  raw: unknown,
): MutationResult {
  if (actor.role === "viewer") {
    return { ok: false, code: "forbidden", message: "編集権限がありません" };
  }
  const parsed = accountWriteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "入力が不正です",
      fieldErrors: parsed.error.issues.map((i) => ({
        path: i.path.join(".") || "form",
        message: i.message,
      })),
    };
  }
  const codeTaken = [...store.accounts.values()].some(
    (a) => a.code === parsed.data.code,
  );
  if (codeTaken) {
    return {
      ok: false,
      code: "conflict",
      message: "取引先コードが既に使われています",
      fieldErrors: [{ path: "code", message: "コードが重複しています" }],
    };
  }
  if (
    parsed.data.parentAccountId &&
    !store.accounts.has(parsed.data.parentAccountId)
  ) {
    return {
      ok: false,
      code: "validation",
      message: "親取引先が存在しません",
      fieldErrors: [
        { path: "parentAccountId", message: "親取引先が存在しません" },
      ],
    };
  }

  const account = normalizeWrite(parsed.data, null, actor);
  store.accounts.set(account.id, account);
  store.ops.set(account.id, {
    accountId: account.id,
    openOrderCount: 0,
    openOrderAmount: 0,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 0,
  });
  store.events.push({
    id: nextId("ev"),
    accountId: account.id,
    at: account.createdAt,
    actorId: actor.id,
    kind: "created",
    summary: "取引先を登録",
  });
  return { ok: true, account };
}

export function updateAccount(
  actor: Actor,
  id: string,
  raw: unknown,
): MutationResult {
  if (actor.role === "viewer") {
    return { ok: false, code: "forbidden", message: "編集権限がありません" };
  }
  const existing = store.accounts.get(id);
  if (!existing) {
    return { ok: false, code: "not_found", message: "取引先が見つかりません" };
  }
  const parsed = accountWriteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "入力が不正です",
      fieldErrors: parsed.error.issues.map((i) => ({
        path: i.path.join(".") || "form",
        message: i.message,
      })),
    };
  }
  // code immutable: ignore client code change
  const data = { ...parsed.data, code: existing.code };
  if (data.parentAccountId === id) {
    return {
      ok: false,
      code: "validation",
      message: "自己参照はできません",
      fieldErrors: [
        { path: "parentAccountId", message: "自己を親にできません" },
      ],
    };
  }
  if (data.parentAccountId && !store.accounts.has(data.parentAccountId)) {
    return {
      ok: false,
      code: "validation",
      message: "親取引先が存在しません",
      fieldErrors: [
        { path: "parentAccountId", message: "親取引先が存在しません" },
      ],
    };
  }

  const account = normalizeWrite(data, existing, actor);
  store.accounts.set(account.id, account);
  store.events.push({
    id: nextId("ev"),
    accountId: account.id,
    at: account.updatedAt,
    actorId: actor.id,
    kind: "updated",
    summary: "取引先を更新",
  });
  if (existing.creditHold !== account.creditHold) {
    store.events.push({
      id: nextId("ev"),
      accountId: account.id,
      at: account.updatedAt,
      actorId: actor.id,
      kind: "credit_hold_changed",
      summary: account.creditHold
        ? `与信停止: ${account.creditHoldReason ?? ""}`
        : "与信停止を解除",
    });
  }
  return { ok: true, account };
}

export function debugReadiness(id: string) {
  const a = store.accounts.get(id);
  return a ? computeReadiness(a) : null;
}

export function listParentOptions(): { id: string; label: string }[] {
  return [...store.accounts.values()]
    .filter((a) => !a.parentAccountId)
    .map((a) => ({
      id: a.id,
      label: `${a.code} · ${a.tradeName || a.legalName}`,
    }));
}
