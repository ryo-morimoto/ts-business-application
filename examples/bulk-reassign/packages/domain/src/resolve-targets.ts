import type { Customer, CustomerFilter, SelectionScope } from "@bulk-reassign/contracts";

export function matchesFilter(
  customer: Customer,
  filter: CustomerFilter,
): boolean {
  if (filter.query) {
    const q = filter.query.toLowerCase();
    if (!customer.name.toLowerCase().includes(q)) return false;
  }
  if (filter.assigneeId !== undefined) {
    if (customer.assigneeId !== filter.assigneeId) return false;
  }
  return true;
}

export function filterCustomers(
  customers: readonly Customer[],
  filter: CustomerFilter,
): Customer[] {
  return customers.filter((c) => matchesFilter(c, filter));
}

export type ResolveTargetIdsInput = {
  scope: SelectionScope;
  /** Full dataset; server truth for all_matching. */
  customers: readonly Customer[];
};

export type ResolveTargetIdsResult = {
  targetIds: string[];
  mode: SelectionScope["mode"];
  count: number;
};

/**
 * Resolve concrete customer ids from selection scope.
 * `all_matching` ignores client estimatedCount and recomputes from data.
 */
export function resolveTargetIds(
  input: ResolveTargetIdsInput,
): ResolveTargetIdsResult {
  const { scope, customers } = input;

  if (scope.mode === "page") {
    const targetIds = [...scope.ids];
    return { targetIds, mode: "page", count: targetIds.length };
  }

  const excluded = new Set(scope.excludedIds);
  const matching = filterCustomers(customers, scope.filter);
  const targetIds = matching.map((c) => c.id).filter((id) => !excluded.has(id));
  return { targetIds, mode: "all_matching", count: targetIds.length };
}
