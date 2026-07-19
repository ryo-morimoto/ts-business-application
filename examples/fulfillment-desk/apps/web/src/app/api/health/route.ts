import { json } from "@/server/http";

export function GET() {
  return json({ ok: true, service: "fulfillment-desk" });
}
