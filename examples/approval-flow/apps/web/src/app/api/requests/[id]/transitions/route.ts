import { transitionBodySchema } from "@approval-flow/contracts";
import { applyTransition } from "@approval-flow/domain";
import { actorFromRequest, json, statusForReason } from "@/server/http";
import { getRequest, saveRequest } from "@/server/store";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const body = await req.json().catch(() => null);
  const parsed = transitionBodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid_body", details: parsed.error.flatten() },
      400,
    );
  }

  const current = getRequest(id);
  const result = applyTransition({
    request: current,
    action: parsed.data.action,
    actor,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return json(
      {
        error: "transition_denied",
        reason: result.reason,
        currentStatus: current?.status,
        action: parsed.data.action,
      },
      statusForReason(result.reason),
    );
  }

  saveRequest(result.request);
  return json(result.request);
}
