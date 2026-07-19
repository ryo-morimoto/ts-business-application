import { Hono } from "hono";
import { bulkAssignRequestSchema } from "@bulk-reassign/contracts";
import { applyBulkAssign, resolveTargetIds } from "@bulk-reassign/domain";
import type { AppEnv } from "../middleware/actor";
import { getCustomerMap, getCustomers, replaceCustomers } from "../store/customers";
import {
  getIdempotentResult,
  saveIdempotentResult,
} from "../store/idempotency";
import { deniedCustomerIdsFor } from "../store/permissions";

export const bulkAssignRoute = new Hono<AppEnv>();

bulkAssignRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = bulkAssignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const request = parsed.data;
  const cached = getIdempotentResult(request.requestId);
  if (cached) {
    return c.json(cached);
  }

  const actor = c.get("actor");
  const { targetIds } = resolveTargetIds({
    scope: request.scope,
    customers: getCustomers(),
  });

  const { result, nextCustomersById } = applyBulkAssign({
    requestId: request.requestId,
    assigneeId: request.assigneeId,
    targetIds,
    customersById: getCustomerMap(),
    actor,
    deniedCustomerIds: deniedCustomerIdsFor(actor.id),
  });

  replaceCustomers(nextCustomersById);
  saveIdempotentResult(result);

  return c.json(result);
});
