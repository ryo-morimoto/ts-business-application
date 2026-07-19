import type {
  CustomerSnippet,
  OrderDetail,
  OrderLine,
  OrderStatus,
  OrderSummary,
} from "@fulfillment-desk/contracts";

/** External OMS order DTO (snake_case) — input to composition only. */
export type ForeignOrder = {
  order_id: string;
  status: OrderStatus;
  warehouse_id: string;
  customer_id: string;
  line_items: Array<{ sku: string; qty: number }>;
  updated_at: string;
};

export type ForeignCustomer = {
  cust_id: string;
  full_name: string;
  ship_to_city: string;
};

export type ForeignAvailability = {
  sku: string;
  warehouse_id: string;
  available_qty: number;
};

export function toOrderSummary(order: ForeignOrder): OrderSummary {
  return {
    id: order.order_id,
    status: order.status,
    warehouseId: order.warehouse_id,
    customerId: order.customer_id,
    lineCount: order.line_items.length,
    updatedAt: order.updated_at,
  };
}

export function composeOrderDetail(
  order: ForeignOrder,
  customer: ForeignCustomer,
  availability: ForeignAvailability[],
): OrderDetail {
  const availBySku = new Map(
    availability.map((a) => [a.sku, a.available_qty] as const),
  );

  const lines: OrderLine[] = order.line_items.map((li) => {
    const availableQty = availBySku.get(li.sku) ?? 0;
    const shortfall = Math.max(0, li.qty - availableQty);
    return {
      sku: li.sku,
      qty: li.qty,
      availableQty,
      shortfall,
    };
  });

  const customerSnippet: CustomerSnippet = {
    id: customer.cust_id,
    name: customer.full_name,
    shipCity: customer.ship_to_city,
  };

  return {
    ...toOrderSummary(order),
    customer: customerSnippet,
    lines,
    canShipByStock: lines.every((l) => l.shortfall === 0),
  };
}
