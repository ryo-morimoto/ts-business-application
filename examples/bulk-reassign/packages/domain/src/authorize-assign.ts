import type { ActionPolicy } from "@bulk-reassign/contracts";

export type Actor = {
  id: string;
};

/**
 * Returns whether actor may change assignee for customerId.
 * `deniedCustomerIds` is the server permission snapshot for this actor.
 */
export function authorizeAssign(input: {
  actor: Actor;
  customerId: string;
  customerExists: boolean;
  deniedCustomerIds: ReadonlySet<string>;
}): ActionPolicy | { allowed: false; reason: "not_found" } {
  if (!input.customerExists) {
    return { allowed: false, reason: "not_found" };
  }
  if (input.deniedCustomerIds.has(input.customerId)) {
    return { allowed: false, reason: "missing_permission" };
  }
  return { allowed: true };
}
