import { json } from "@/server/http";
import { getRequest } from "@/server/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = getRequest(id);
  if (!row) {
    return json(
      { error: "transition_denied", reason: "not_found" },
      404,
    );
  }
  return json(row);
}
