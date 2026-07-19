import { resolveActor } from "@approval-flow/domain";
import type { NextRequest } from "next/server";

export function actorFromRequest(req: NextRequest | Request) {
  const id = req.headers.get("x-actor-id");
  return resolveActor(id);
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function statusForReason(
  reason:
    | "missing_permission"
    | "wrong_state"
    | "reason_required"
    | "not_found"
    | "not_owner",
): number {
  switch (reason) {
    case "not_found":
      return 404;
    case "missing_permission":
    case "not_owner":
      return 403;
    case "wrong_state":
      return 409;
    case "reason_required":
      return 400;
    default:
      return 400;
  }
}
