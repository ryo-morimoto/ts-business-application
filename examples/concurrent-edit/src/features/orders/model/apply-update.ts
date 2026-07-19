import type { Order, UpdateOrderInput, UpdateOrderResult } from "./schemas";

export function lineTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export function orderTotal(order: Pick<Order, "lines">): number {
  return order.lines.reduce(
    (sum, line) => sum + lineTotal(line.quantity, line.unitPrice),
    0,
  );
}

/**
 * Pure optimistic-concurrency apply.
 * Never last-write-wins: expectedVersion must equal current.version.
 */
export function applyOrderUpdate(input: {
  current: Order | undefined;
  patch: UpdateOrderInput;
  actorId: string;
  now?: string;
}): UpdateOrderResult {
  const { current, patch, actorId } = input;
  const now = input.now ?? new Date().toISOString();

  if (!current || current.id !== patch.id) {
    return { ok: false, code: "not_found" };
  }

  if (current.version !== patch.expectedVersion) {
    return {
      ok: false,
      code: "version_conflict",
      yourExpected: patch.expectedVersion,
      current: structuredClone(current),
    };
  }

  const next: Order = {
    id: current.id,
    customerName: patch.customerName,
    note: patch.note,
    lines: patch.lines.map((line) => ({ ...line })),
    version: current.version + 1,
    updatedAt: now,
    updatedBy: actorId,
  };

  return { ok: true, order: next };
}
