import type {
  ForeignAvailability,
  ForeignCustomer,
  ForeignOrder,
} from "@fulfillment-desk/domain";
import {
  customerGet,
  customerReset,
} from "./customer-mock";
import { inventoryGetMany } from "./inventory-mock";
import {
  omsGetOrder,
  omsListOrders,
  omsReset,
  omsShipOrder,
  type OmsListParams,
  type OmsShipData,
  type OmsShipInput,
} from "./oms-mock";
import type { ExternalCallOptions, ExternalResult } from "./types";

/**
 * Ports the BFF depends on. Default = foreign mocks.
 * Tests can inject fakes without rewriting orchestration.
 */
export type ExternalPorts = {
  oms: {
    listOrders: (
      params?: OmsListParams,
      opts?: ExternalCallOptions,
    ) => Promise<ExternalResult<ForeignOrder[]>>;
    getOrder: (
      orderId: string,
      opts?: ExternalCallOptions,
    ) => Promise<ExternalResult<ForeignOrder>>;
    shipOrder: (
      input: OmsShipInput,
      opts?: ExternalCallOptions,
    ) => Promise<ExternalResult<OmsShipData>>;
  };
  customer: {
    get: (
      custId: string,
      opts?: ExternalCallOptions,
    ) => Promise<ExternalResult<ForeignCustomer>>;
  };
  inventory: {
    getMany: (
      pairs: Array<{ sku: string; warehouse_id: string }>,
      opts?: ExternalCallOptions,
    ) => Promise<ExternalResult<ForeignAvailability[]>>;
  };
  reset: () => void;
};

export function createDefaultPorts(): ExternalPorts {
  return {
    oms: {
      listOrders: omsListOrders,
      getOrder: omsGetOrder,
      shipOrder: omsShipOrder,
    },
    customer: {
      get: customerGet,
    },
    inventory: {
      getMany: inventoryGetMany,
    },
    reset: () => {
      omsReset();
      customerReset();
    },
  };
}
