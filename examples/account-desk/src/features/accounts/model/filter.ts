import { computeReadiness } from "./readiness";
import {
  OWNERS,
  PAGE_SIZE,
  type Account,
  type AccountListItem,
  type AccountOpsSummary,
  type ListQuery,
  type ListResult,
} from "./types";

export function displayName(account: Account): string {
  return account.tradeName?.trim() || account.legalName;
}

export function toListItem(
  account: Account,
  ops: AccountOpsSummary,
  parentById: Map<string, Account>,
): AccountListItem {
  const parent = account.parentAccountId
    ? parentById.get(account.parentAccountId)
    : undefined;
  return {
    account,
    readiness: computeReadiness(account),
    ops,
    parentTradeName: parent
      ? displayName(parent)
      : undefined,
    ownerLabel: OWNERS[account.ownerId as keyof typeof OWNERS] ?? account.ownerId,
    displayName: displayName(account),
    availableCredit: account.creditLimit - ops.accruedReceivables,
  };
}

export function filterSortPage(
  accounts: Account[],
  opsById: Map<string, AccountOpsSummary>,
  query: ListQuery,
): ListResult {
  const parentById = new Map(accounts.map((a) => [a.id, a]));
  const pageSize = query.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);

  let rows = accounts.map((a) => {
    const ops = opsById.get(a.id) ?? {
      accountId: a.id,
      openOrderCount: 0,
      openOrderAmount: 0,
      overdueInvoiceCount: 0,
      overdueAmount: 0,
      accruedReceivables: 0,
    };
    return toListItem(a, ops, parentById);
  });

  const q = query.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) => {
      const a = r.account;
      return (
        a.code.toLowerCase().includes(q) ||
        a.legalName.toLowerCase().includes(q) ||
        (a.tradeName?.toLowerCase().includes(q) ?? false) ||
        (a.nameKana?.toLowerCase().includes(q) ?? false)
      );
    });
  }

  if (query.status) {
    rows = rows.filter((r) => r.account.status === query.status);
  }
  if (query.ownerId) {
    rows = rows.filter((r) => r.account.ownerId === query.ownerId);
  }
  if (query.segment) {
    rows = rows.filter((r) => r.account.segment === query.segment);
  }
  if (query.incomplete) {
    rows = rows.filter((r) => !r.readiness.ready);
  }
  if (query.creditHold) {
    rows = rows.filter((r) => r.account.creditHold);
  }

  const sort = query.sort ?? "updatedAt";
  rows.sort((a, b) => {
    let cmp = 0;
    if (sort === "name") {
      cmp = a.displayName.localeCompare(b.displayName, "ja");
    } else if (sort === "code") {
      cmp = a.account.code.localeCompare(b.account.code);
    } else {
      cmp = b.account.updatedAt.localeCompare(a.account.updatedAt);
    }
    if (cmp !== 0) return cmp;
    return a.account.id.localeCompare(b.account.id);
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  let emptyKind: ListResult["emptyKind"] = "data";
  if (accounts.length === 0) emptyKind = "empty";
  else if (total === 0) emptyKind = "zero";

  return { items, total, page, pageSize, emptyKind };
}
