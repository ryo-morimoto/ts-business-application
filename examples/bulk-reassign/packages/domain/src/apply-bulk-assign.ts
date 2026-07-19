import type {
  BulkAssignFailure,
  BulkAssignResult,
  Customer,
} from "@bulk-reassign/contracts";
import { authorizeAssign, type Actor } from "./authorize-assign";

export type ApplyBulkAssignInput = {
  requestId: string;
  assigneeId: string;
  targetIds: readonly string[];
  customersById: ReadonlyMap<string, Customer>;
  actor: Actor;
  deniedCustomerIds: ReadonlySet<string>;
};

export type ApplyBulkAssignOutput = {
  result: BulkAssignResult;
  /** Customers after successful assigns (immutable update). */
  nextCustomersById: Map<string, Customer>;
};

/**
 * Pure bulk apply: per-id authorize + mutate. Never silent-skips failures.
 */
export function applyBulkAssign(
  input: ApplyBulkAssignInput,
): ApplyBulkAssignOutput {
  const succeeded: { id: string }[] = [];
  const failed: BulkAssignFailure[] = [];
  const nextCustomersById = new Map(input.customersById);

  for (const id of input.targetIds) {
    const existing = input.customersById.get(id);
    const policy = authorizeAssign({
      actor: input.actor,
      customerId: id,
      customerExists: existing !== undefined,
      deniedCustomerIds: input.deniedCustomerIds,
    });

    if (!policy.allowed) {
      failed.push({
        id,
        reason: policy.reason,
      });
      continue;
    }

    if (!existing) {
      failed.push({ id, reason: "not_found" });
      continue;
    }

    nextCustomersById.set(id, {
      ...existing,
      assigneeId: input.assigneeId,
    });
    succeeded.push({ id });
  }

  return {
    result: {
      requestId: input.requestId,
      succeeded,
      failed,
    },
    nextCustomersById,
  };
}

export function summarizeBulkResult(result: BulkAssignResult) {
  const successCount = result.succeeded.length;
  const failureCount = result.failed.length;
  const total = successCount + failureCount;
  return {
    requestId: result.requestId,
    successCount,
    failureCount,
    isPartial: successCount > 0 && failureCount > 0,
    isFullSuccess: total > 0 && failureCount === 0,
    isFullFailure: total > 0 && successCount === 0,
  };
}
