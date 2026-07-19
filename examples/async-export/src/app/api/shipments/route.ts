import {
  listShipmentsForActor,
  shipmentStatusSchema,
  warehouseIdSchema,
} from "@/entities/shipment";
import { resolveRuntimeActor } from "@/features/export-jobs/server/job-store";
import { actorFromRequest, json } from "@/shared/actor/http";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listQuerySchema = z.object({
  warehouseId: warehouseIdSchema.optional(),
  status: shipmentStatusSchema.optional(),
  assigneeId: z.string().min(1).optional(),
  plannedShipDateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  plannedShipDateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function criteriaFromSearchParams(sp: URLSearchParams) {
  const raw = {
    warehouseId: sp.get("warehouseId") || undefined,
    status: sp.get("status") || undefined,
    assigneeId: sp.get("assigneeId") || undefined,
    plannedShipDateFrom: sp.get("plannedShipDateFrom") || undefined,
    plannedShipDateTo: sp.get("plannedShipDateTo") || undefined,
  };
  return listQuerySchema.safeParse(raw);
}

export function GET(req: NextRequest) {
  const actor = resolveRuntimeActor(actorFromRequest(req));
  const parsed = criteriaFromSearchParams(req.nextUrl.searchParams);
  if (!parsed.success) {
    return json(
      {
        error: "invalid_query",
        message: "検索条件の形式が正しくありません。",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const { items, total } = listShipmentsForActor(actor, parsed.data);
  const pageSize = 50;
  return json({
    items: items.slice(0, pageSize),
    total,
    totalIsExact: true as const,
    pageSize,
    criteria: parsed.data,
    actor: {
      id: actor.id,
      role: actor.role,
      warehouseIds: actor.warehouseIds,
    },
  });
}
