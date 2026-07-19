import { shipBodySchema } from "@fulfillment-desk/contracts";
import { shipOrder } from "@/server/bff/orders";
import { actorFromRequest, appErrorResponse, json } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const body = await req.json().catch(() => null);
  const parsed = shipBodySchema.safeParse(body);
  if (!parsed.success) {
    return appErrorResponse({
      error: "app_error",
      code: "invalid_body",
      message: "carrierCode is required",
    });
  }

  const result = await shipOrder(id, parsed.data.carrierCode, actor);
  if (!result.ok) {
    return appErrorResponse(result.error);
  }
  const headers = new Headers();
  headers.set("x-correlation-id", result.data.provenance.correlationId);
  return json(result.data, 200, { headers });
}
