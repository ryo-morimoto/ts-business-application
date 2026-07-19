export type ActorRole = "viewer" | "operator" | "admin";

export type Actor = {
  id: string;
  role: ActorRole;
};

const ROLE_BY_ID: Record<string, ActorRole> = {
  viewer: "viewer",
  operator: "operator",
  admin: "admin",
};

export function resolveActor(actorId: string | null | undefined): Actor {
  const id = actorId?.trim() || "operator";
  const role = ROLE_BY_ID[id] ?? "viewer";
  return { id, role };
}

export function canShip(actor: Actor): boolean {
  return actor.role === "operator" || actor.role === "admin";
}
