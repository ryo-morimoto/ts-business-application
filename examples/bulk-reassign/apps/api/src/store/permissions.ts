import { DENIED_BY_ACTOR } from "../fixtures/seed";

export function deniedCustomerIdsFor(actorId: string): Set<string> {
  const list = DENIED_BY_ACTOR[actorId] ?? DENIED_BY_ACTOR["agent-a"] ?? [];
  return new Set(list);
}
