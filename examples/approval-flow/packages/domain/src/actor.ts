export type ActorRole = "author" | "reviewer" | "admin";

export type Actor = {
  id: string;
  role: ActorRole;
};

const ROLE_BY_ID: Record<string, ActorRole> = {
  author: "author",
  reviewer: "reviewer",
  admin: "admin",
};

export function resolveActor(actorId: string | null | undefined): Actor {
  const id = actorId?.trim() || "author";
  const role = ROLE_BY_ID[id] ?? "author";
  return { id, role };
}
