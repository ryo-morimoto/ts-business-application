import type { BulkAssignResult } from "@bulk-reassign/contracts";

const store = new Map<string, BulkAssignResult>();

export function getIdempotentResult(
  requestId: string,
): BulkAssignResult | undefined {
  return store.get(requestId);
}

export function saveIdempotentResult(result: BulkAssignResult): void {
  store.set(result.requestId, result);
}

export function resetIdempotency(): void {
  store.clear();
}
