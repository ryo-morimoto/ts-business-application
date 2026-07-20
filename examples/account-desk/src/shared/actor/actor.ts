export const ACTOR_COOKIE = "account-desk-actor";
export const ACTOR_HEADER = "x-actor-id";

export const ACTORS = {
  alice: { id: "alice", label: "山田 太郎（editor）", role: "editor" as const },
  bob: { id: "bob", label: "佐藤 花子（editor）", role: "editor" as const },
  viewer: {
    id: "viewer",
    label: "参照 のみ（viewer）",
    role: "viewer" as const,
  },
} as const;

export type ActorId = keyof typeof ACTORS;
export type Actor = (typeof ACTORS)[ActorId];

export function parseActorId(raw: string | null | undefined): ActorId {
  if (raw && raw in ACTORS) return raw as ActorId;
  return "alice";
}
