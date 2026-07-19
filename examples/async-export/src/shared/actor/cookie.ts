/** client / server 共有の cookie 名 */
export const ACTOR_COOKIE = "async-export-actor";
export const ACTOR_HEADER = "x-actor-id";

export function setActorCookie(actorId: string): void {
  document.cookie = `${ACTOR_COOKIE}=${encodeURIComponent(actorId)}; path=/; SameSite=Lax`;
}

export function readActorCookie(): string {
  if (typeof document === "undefined") return "clerk";
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ACTOR_COOKIE}=`));
  return match
    ? decodeURIComponent(match.slice(ACTOR_COOKIE.length + 1))
    : "clerk";
}
