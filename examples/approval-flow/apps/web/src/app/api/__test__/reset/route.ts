import { json } from "@/server/http";
import { resetStore } from "@/server/store";

export function POST() {
  resetStore();
  return json({ ok: true });
}
