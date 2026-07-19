import type { ForeignError } from "@fulfillment-desk/domain";
import type {
  ForeignAvailability,
  ForeignCustomer,
  ForeignOrder,
} from "@fulfillment-desk/domain";

export type ExternalResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ForeignError };

/** Options every outbound SoR call accepts (HTTP-like). */
export type ExternalCallOptions = {
  /** Soft deadline for this call; overrun → foreign timeout. */
  budgetMs?: number;
  /** Extra artificial latency (ms) before work — demos / tests. */
  latencyMs?: number;
};

export type {
  ForeignOrder,
  ForeignCustomer,
  ForeignAvailability,
  ForeignError,
};
