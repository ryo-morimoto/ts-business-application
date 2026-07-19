import { submit } from "@/modules/drafting";
import { actorFromRequest } from "@/shared/actor/resolve";
import { httpStatus } from "@/shared/http/result";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const result = submit(actor, id);
  if (!result.ok) {
    return Response.json(result, { status: httpStatus(result) });
  }
  return Response.json({ submitted: result.submitted }, { status: 201 });
}
