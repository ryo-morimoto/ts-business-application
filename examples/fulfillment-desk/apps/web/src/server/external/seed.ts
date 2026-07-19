import type {
  ForeignAvailability,
  ForeignCustomer,
  ForeignOrder,
} from "@fulfillment-desk/domain";

export const SEED_ORDERS: ForeignOrder[] = [
  {
    order_id: "ord_001",
    status: "ready_to_ship",
    warehouse_id: "wh_tokyo",
    customer_id: "cust_01",
    line_items: [
      { sku: "SKU-A", qty: 2 },
      { sku: "SKU-C", qty: 1 },
    ],
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    order_id: "ord_002",
    status: "ready_to_ship",
    warehouse_id: "wh_tokyo",
    customer_id: "cust_02",
    line_items: [{ sku: "SKU-B", qty: 5 }],
    updated_at: "2026-01-02T00:00:00.000Z",
  },
  {
    order_id: "ord_003",
    status: "ready_to_ship",
    warehouse_id: "wh_osaka",
    customer_id: "cust_01",
    line_items: [{ sku: "SKU-A", qty: 1 }],
    updated_at: "2026-01-03T00:00:00.000Z",
  },
  {
    order_id: "ord_004",
    status: "shipped",
    warehouse_id: "wh_tokyo",
    customer_id: "cust_03",
    line_items: [{ sku: "SKU-A", qty: 1 }],
    updated_at: "2026-01-04T00:00:00.000Z",
  },
  {
    order_id: "ord_005",
    status: "cancelled",
    warehouse_id: "wh_osaka",
    customer_id: "cust_02",
    line_items: [{ sku: "SKU-C", qty: 2 }],
    updated_at: "2026-01-05T00:00:00.000Z",
  },
  /**
   * OMS row references a customer the customer SoR does not have.
   * Detail composition must fail at the customer step (not invent a name).
   */
  {
    order_id: "ord_orphan",
    status: "ready_to_ship",
    warehouse_id: "wh_tokyo",
    customer_id: "cust_missing",
    line_items: [{ sku: "SKU-A", qty: 1 }],
    updated_at: "2026-01-06T00:00:00.000Z",
  },
];

export const SEED_CUSTOMERS: ForeignCustomer[] = [
  {
    cust_id: "cust_01",
    full_name: "Acme Corp",
    ship_to_city: "Tokyo",
  },
  {
    cust_id: "cust_02",
    full_name: "Beta Industries",
    ship_to_city: "Osaka",
  },
  {
    cust_id: "cust_03",
    full_name: "Cherry LLC",
    ship_to_city: "Yokohama",
  },
];

export const SEED_INVENTORY: ForeignAvailability[] = [
  { sku: "SKU-A", warehouse_id: "wh_tokyo", available_qty: 20 },
  { sku: "SKU-A", warehouse_id: "wh_osaka", available_qty: 4 },
  { sku: "SKU-B", warehouse_id: "wh_tokyo", available_qty: 3 },
  { sku: "SKU-B", warehouse_id: "wh_osaka", available_qty: 0 },
  { sku: "SKU-C", warehouse_id: "wh_tokyo", available_qty: 10 },
  { sku: "SKU-C", warehouse_id: "wh_osaka", available_qty: 1 },
];
