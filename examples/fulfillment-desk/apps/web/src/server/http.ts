import type { AppError } from "@fulfillment-desk/contracts";
import {
  httpStatusForAppError,
  resolveActor,
} from "@fulfillment-desk/domain";
import type { NextRequest } from "next/server";

export function actorFromRequest(req: NextRequest | Request) {
  const id = req.headers.get("x-actor-id");
  return resolveActor(id);
}

export function json(data: unknown, status = 200, init?: ResponseInit): Response {
  return Response.json(data, { ...init, status });
}

export function appErrorResponse(error: AppError): Response {
  const headers = new Headers();
  if (error.retryAfterSec) {
    headers.set("Retry-After", String(error.retryAfterSec));
  }
  if (error.correlationId) {
    headers.set("x-correlation-id", error.correlationId);
  }
  return json(error, httpStatusForAppError(error.code), { headers });
}
