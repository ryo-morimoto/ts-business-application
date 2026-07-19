import { resetStore } from "@/modules/drafting";

export async function POST() {
  resetStore();
  return Response.json({ ok: true });
}
