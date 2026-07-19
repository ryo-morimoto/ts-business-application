import { json } from "@/shared/actor/http";

export function GET() {
  return json({ ok: true, example: "async-export" });
}
