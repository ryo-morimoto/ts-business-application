import { getPurchaseRequest } from "@/modules/drafting";
import { actorFromRequest } from "@/shared/actor/resolve";
import { httpStatus } from "@/shared/http/result";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const result = getPurchaseRequest(actor, id);
  if (!result.ok) {
    return Response.json(result, { status: httpStatus(result) });
  }
  return Response.json({ submitted: result.submitted });
}
