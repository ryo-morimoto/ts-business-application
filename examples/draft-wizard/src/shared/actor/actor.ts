export type ActorId = "author" | "viewer" | "admin";

export type Actor = {
  id: ActorId;
  label: string;
  canWrite: boolean;
  canReadAll: boolean;
};

const ACTORS: Record<ActorId, Actor> = {
  author: {
    id: "author",
    label: "作成者（自分の draft を編集可）",
    canWrite: true,
    canReadAll: false,
  },
  viewer: {
    id: "viewer",
    label: "閲覧のみ",
    canWrite: false,
    canReadAll: true,
  },
  admin: {
    id: "admin",
    label: "管理者（全 draft）",
    canWrite: true,
    canReadAll: true,
  },
};

export function listActors(): Actor[] {
  return Object.values(ACTORS);
}

export function resolveActor(raw: string | undefined | null): Actor {
  if (raw && raw in ACTORS) return ACTORS[raw as ActorId];
  return ACTORS.author;
}

export function isActorId(value: string): value is ActorId {
  return value in ACTORS;
}
