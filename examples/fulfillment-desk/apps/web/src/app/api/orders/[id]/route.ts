import { getOrderDetail } from "@/server/bff/orders";
import { appErrorResponse, json } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const result = await getOrderDetail(id);
  if (!result.ok) {
    return appErrorResponse(result.error);
  }
  const headers = new Headers();
  headers.set("x-correlation-id", result.data.provenance.correlationId);
  return json(result.data, 200, { headers });
}
