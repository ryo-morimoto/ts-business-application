export const ACTOR_COOKIE = "concurrent-edit-actor";
export const ACTOR_HEADER = "x-actor-id";

export const ACTOR_IDS = ["alice", "bob", "viewer"] as const;
export type ActorId = (typeof ACTOR_IDS)[number];

export type ActorRole = "editor" | "viewer";

export type Actor = {
  id: ActorId;
  label: string;
  role: ActorRole;
};

export const ACTORS: Record<ActorId, Actor> = {
  alice: { id: "alice", label: "Alice (editor)", role: "editor" },
  bob: { id: "bob", label: "Bob (editor)", role: "editor" },
  viewer: { id: "viewer", label: "Viewer (read-only)", role: "viewer" },
};

export function isActorId(value: string | undefined | null): value is ActorId {
  return (
    value === "alice" || value === "bob" || value === "viewer"
  );
}

export function parseActorId(value: string | undefined | null): ActorId {
  return isActorId(value) ? value : "alice";
}

export function canEdit(actor: Actor): boolean {
  return actor.role === "editor";
}
