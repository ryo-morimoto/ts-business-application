import type { Customer } from "@bulk-reassign/contracts";

export const SEED_CUSTOMERS: Customer[] = [
  { id: "c-001", name: "Acme Corp", assigneeId: "u-1" },
  { id: "c-002", name: "Beta LLC", assigneeId: "u-1" },
  { id: "c-003", name: "Gamma Inc", assigneeId: "u-2" },
  { id: "c-004", name: "Delta Co", assigneeId: null },
  { id: "c-005", name: "Epsilon Ltd", assigneeId: "u-2" },
  { id: "c-006", name: "Zeta GmbH", assigneeId: "u-3" },
  { id: "c-007", name: "Eta SA", assigneeId: null },
  { id: "c-008", name: "Theta BV", assigneeId: "u-1" },
];

/** Per-actor customer ids that cannot be reassigned. */
export const DENIED_BY_ACTOR: Record<string, string[]> = {
  admin: [],
  "agent-a": ["c-003"],
  "agent-b": ["c-002", "c-005"],
};
