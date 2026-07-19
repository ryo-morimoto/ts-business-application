export const ACTOR_COOKIE = "kobutsu-satei-actor";
export const ACTOR_HEADER = "x-actor-id";

export const ACTOR_IDS = ["appraiser", "compliance", "viewer"] as const;
export type ActorId = (typeof ACTOR_IDS)[number];

export type ActorRole = "appraiser" | "compliance" | "viewer";

export type Actor = {
  id: ActorId;
  label: string;
  role: ActorRole;
};

export const ACTORS: Record<ActorId, Actor> = {
  appraiser: {
    id: "appraiser",
    label: "査定オペレータ",
    role: "appraiser",
  },
  compliance: {
    id: "compliance",
    label: "コンプラ (CMS)",
    role: "compliance",
  },
  viewer: { id: "viewer", label: "閲覧のみ", role: "viewer" },
};

export function isActorId(value: string | undefined | null): value is ActorId {
  return (
    value === "appraiser" || value === "compliance" || value === "viewer"
  );
}

export function parseActorId(value: string | undefined | null): ActorId {
  return isActorId(value) ? value : "appraiser";
}

export function canView(actor: Actor): boolean {
  return true;
}

export function canAppraise(actor: Actor): boolean {
  return actor.role === "appraiser" || actor.role === "compliance";
}

export function canManageRules(actor: Actor): boolean {
  return actor.role === "compliance";
}
