import type { ForeignCustomer } from "@fulfillment-desk/domain";
import { runForeignCall } from "./call";
import { SEED_CUSTOMERS } from "./seed";
import type { ExternalCallOptions, ExternalResult } from "./types";

type CustomerState = {
  customers: ForeignCustomer[];
};

const G = globalThis as typeof globalThis & {
  __fulfillmentDeskCustomers?: CustomerState;
};

function state(): CustomerState {
  if (!G.__fulfillmentDeskCustomers) {
    G.__fulfillmentDeskCustomers = {
      customers: structuredClone(SEED_CUSTOMERS),
    };
  }
  return G.__fulfillmentDeskCustomers;
}

export async function customerGet(
  custId: string,
  opts?: ExternalCallOptions,
): Promise<ExternalResult<ForeignCustomer>> {
  return runForeignCall(opts, () => {
    const row = state().customers.find((c) => c.cust_id === custId);
    if (!row) {
      return {
        ok: false,
        error: {
          err_code: "not_found",
          err_msg: `customer ${custId} not found`,
        },
      };
    }
    return { ok: true, data: structuredClone(row) };
  });
}

export function customerReset(): void {
  G.__fulfillmentDeskCustomers = {
    customers: structuredClone(SEED_CUSTOMERS),
  };
}
