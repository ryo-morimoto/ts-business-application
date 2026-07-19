import type { Actor } from "@/shared/actor";

export function canReadDraft(
  actor: Actor,
  ownerId: string,
): boolean {
  if (actor.canReadAll) return true;
  return actor.id === ownerId;
}

export function canWriteDraft(
  actor: Actor,
  ownerId: string,
): boolean {
  if (!actor.canWrite) return false;
  if (actor.id === "admin") return true;
  return actor.id === ownerId;
}
