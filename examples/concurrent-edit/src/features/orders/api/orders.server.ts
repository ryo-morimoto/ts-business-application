import { applyOrderUpdate, orderTotal } from "../model/apply-update";
import type {
  Order,
  OrderListItem,
  UpdateOrderInput,
  UpdateOrderResult,
} from "../model/schemas";
import { canEdit, type Actor } from "~/shared/actor/actor";

function seedOrders(): Map<string, Order> {
  const now = "2026-03-01T09:00:00.000Z";
  const orders: Order[] = [
    {
      id: "ord_1001",
      customerName: "Northwind Trading",
      note: "Ship via express if possible",
      version: 1,
      updatedAt: now,
      updatedBy: "alice",
      lines: [
        {
          id: "ln_1001_1",
          sku: "BOLT-M6",
          description: "Hex bolt M6×20",
          quantity: 100,
          unitPrice: 0.12,
        },
        {
          id: "ln_1001_2",
          sku: "NUT-M6",
          description: "Hex nut M6",
          quantity: 100,
          unitPrice: 0.05,
        },
      ],
    },
    {
      id: "ord_1002",
      customerName: "Contoso Retail",
      note: "",
      version: 4,
      updatedAt: "2026-03-02T11:30:00.000Z",
      updatedBy: "bob",
      lines: [
        {
          id: "ln_1002_1",
          sku: "CABLE-USB-C",
          description: "USB-C cable 1m",
          quantity: 25,
          unitPrice: 4.5,
        },
      ],
    },
  ];
  return new Map(orders.map((o) => [o.id, o]));
}

let store = seedOrders();

export function resetOrderStore(): void {
  store = seedOrders();
}

export function listOrders(): OrderListItem[] {
  return [...store.values()]
    .map((order) => ({
      id: order.id,
      customerName: order.customerName,
      version: order.version,
      updatedAt: order.updatedAt,
      updatedBy: order.updatedBy,
      lineCount: order.lines.length,
      total: orderTotal(order),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getOrder(id: string): Order | undefined {
  const order = store.get(id);
  return order ? structuredClone(order) : undefined;
}

export function updateOrder(input: {
  patch: UpdateOrderInput;
  actor: Actor;
}): UpdateOrderResult {
  if (!canEdit(input.actor)) {
    return { ok: false, code: "forbidden" };
  }

  const current = store.get(input.patch.id);
  const result = applyOrderUpdate({
    current,
    patch: input.patch,
    actorId: input.actor.id,
  });

  if (result.ok) {
    store.set(result.order.id, result.order);
  }

  return result;
}

/** Test helper: force-save as another actor to advance version. */
export function forceSaveOrder(input: {
  id: string;
  actor: Actor;
  customerName?: string;
}): UpdateOrderResult {
  const current = store.get(input.id);
  if (!current) return { ok: false, code: "not_found" };
  if (!canEdit(input.actor)) return { ok: false, code: "forbidden" };

  return updateOrder({
    actor: input.actor,
    patch: {
      id: current.id,
      expectedVersion: current.version,
      customerName: input.customerName ?? `${current.customerName} (peer)`,
      note: current.note,
      lines: current.lines,
    },
  });
}
