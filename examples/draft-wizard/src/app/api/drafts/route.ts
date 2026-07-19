import { create, list } from "@/modules/drafting";
import { actorFromRequest } from "@/shared/actor/resolve";
import { httpStatus } from "@/shared/http/result";

export async function GET(req: Request) {
  const actor = actorFromRequest(req);
  const result = list(actor);
  if (!result.ok) {
    return Response.json(result, { status: httpStatus(result) });
  }
  return Response.json({ drafts: result.drafts });
}

export async function POST(req: Request) {
  const actor = actorFromRequest(req);
  const result = create(actor);
  if (!result.ok) {
    return Response.json(result, { status: httpStatus(result) });
  }
  return Response.json({ draft: result.draft }, { status: 201 });
}
