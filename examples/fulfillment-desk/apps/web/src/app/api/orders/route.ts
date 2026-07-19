import { parseOrderListFilters } from "@fulfillment-desk/domain";
import { listOrders } from "@/server/bff/orders";
import { appErrorResponse, json } from "@/server/http";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw: Record<string, string | undefined> = {};
  for (const key of url.searchParams.keys()) {
    raw[key] = url.searchParams.get(key) ?? undefined;
  }

  const parsed = parseOrderListFilters(raw);
  if (!parsed.ok) {
    return appErrorResponse(parsed.error);
  }

  const result = await listOrders(parsed.query);
  if (!result.ok) {
    return appErrorResponse(result.error);
  }

  return json(result.data);
}
