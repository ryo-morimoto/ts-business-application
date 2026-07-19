import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  forceSaveOrder,
  getOrder,
  listOrders,
  resetOrderStore,
  updateOrder,
} from "./orders.server";
import { updateOrderInputSchema } from "../model/schemas";
import {
  ACTOR_COOKIE,
  ACTOR_HEADER,
  ACTORS,
  parseActorId,
  type Actor,
} from "~/shared/actor/actor";

function readCookie(name: string): string | undefined {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function resolveActor(): Actor {
  const fromHeader = getRequestHeader(ACTOR_HEADER);
  const fromCookie = readCookie(ACTOR_COOKIE);
  const id = parseActorId(fromHeader ?? fromCookie);
  return ACTORS[id];
}

export const listOrdersFn = createServerFn({ method: "GET" }).handler(
  async () => listOrders(),
);

export const getOrderFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const order = getOrder(data.id);
    if (!order) {
      throw new Error(`Order not found: ${data.id}`);
    }
    return order;
  });

export const updateOrderFn = createServerFn({ method: "POST" })
  .validator(updateOrderInputSchema)
  .handler(async ({ data }) => {
    return updateOrder({ patch: data, actor: resolveActor() });
  });

export const resetStoreFn = createServerFn({ method: "POST" }).handler(
  async () => {
    resetOrderStore();
    return { ok: true as const };
  },
);

export const forcePeerSaveFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      actorId: z.enum(["alice", "bob"]),
      customerName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return forceSaveOrder({
      id: data.id,
      actor: ACTORS[data.actorId],
      customerName: data.customerName,
    });
  });
