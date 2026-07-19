import { createDefaultPorts } from "@/server/external";
import { json } from "@/server/http";

export function POST() {
  createDefaultPorts().reset();
  return json({ ok: true });
}
