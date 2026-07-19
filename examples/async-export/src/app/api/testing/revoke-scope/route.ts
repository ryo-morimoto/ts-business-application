import {
  clearRuntimeWarehouseScope,
  setRuntimeWarehouseScope,
} from "@/features/export-jobs";
import { warehouseIdSchema } from "@/shared/catalog/warehouse";
import { actorFromRequest, json } from "@/shared/actor/http";
import { z } from "zod";
import type { NextRequest } from "next/server";

const bodySchema = z.object({
  actorId: z.string().min(1).optional(),
  warehouseIds: z.array(warehouseIdSchema),
});

export async function POST(req: NextRequest) {
  const actor = actorFromRequest(req);
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      {
        error: "invalid_body",
        message: "形式が正しくありません。",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const targetId = parsed.data.actorId ?? actor.id;
  setRuntimeWarehouseScope(targetId, parsed.data.warehouseIds);
  return json({
    ok: true,
    actorId: targetId,
    warehouseIds: parsed.data.warehouseIds,
  });
}

export async function DELETE(req: NextRequest) {
  const actor = actorFromRequest(req);
  const sp = req.nextUrl.searchParams;
  const targetId = sp.get("actorId") ?? actor.id;
  clearRuntimeWarehouseScope(targetId);
  return json({ ok: true, actorId: targetId });
}
