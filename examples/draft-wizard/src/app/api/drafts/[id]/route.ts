import { get, save } from "@/modules/drafting";
import { actorFromRequest } from "@/shared/actor/resolve";
import { httpStatus } from "@/shared/http/result";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const result = get(actor, id);
  if (!result.ok) {
    return Response.json(result, { status: httpStatus(result) });
  }
  return Response.json({ view: result.view });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const body: unknown = await req.json();
  const result = save(actor, id, body);
  if (!result.ok) {
    return Response.json(result, { status: httpStatus(result) });
  }
  return Response.json({ draft: result.draft });
}
