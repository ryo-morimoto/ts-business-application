import { goNext } from "@/modules/drafting";
import { actorFromRequest } from "@/shared/actor/resolve";
import { httpStatus } from "@/shared/http/result";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const body = (await req.json()) as {
    stepId?: unknown;
    patch?: unknown;
  };
  const result = goNext(actor, id, body.stepId, body.patch);
  if (!result.ok) {
    return Response.json(result, { status: httpStatus(result) });
  }
  return Response.json({ draft: result.draft, step: result.step });
}
