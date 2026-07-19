import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { resolveActor, type Actor } from "./actor";
import { ACTOR_COOKIE, ACTOR_HEADER } from "./cookie";

export function actorFromRequest(req: NextRequest | Request): Actor {
  const header = req.headers.get(ACTOR_HEADER);
  if (header) return resolveActor(header);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ACTOR_COOKIE}=`));
  const fromCookie = match?.slice(ACTOR_COOKIE.length + 1);
  return resolveActor(
    fromCookie ? decodeURIComponent(fromCookie) : undefined,
  );
}

export async function actorFromCookies(): Promise<Actor> {
  const jar = await cookies();
  return resolveActor(jar.get(ACTOR_COOKIE)?.value);
}

export function json(
  data: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return Response.json(data, { status, headers });
}
