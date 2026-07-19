import { json } from "@/shared/actor/http";
import { resetAllStores } from "@/shared/testing/reset-all";

export function POST() {
  resetAllStores();
  return json({ ok: true });
}
