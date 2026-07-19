import { getJobForActor } from "@/features/export-jobs";
import { actorFromRequest, json } from "@/shared/actor/http";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const result = getJobForActor(actor, id);
  if (!result.ok) {
    return json(
      { error: result.error, message: result.message },
      result.error === "not_found" ? 404 : 403,
    );
  }
  return json(result.job);
}
