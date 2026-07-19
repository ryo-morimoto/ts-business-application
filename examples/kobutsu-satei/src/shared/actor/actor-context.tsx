import * as React from "react";
import {
  ACTOR_COOKIE,
  ACTORS,
  parseActorId,
  type Actor,
  type ActorId,
} from "./actor";

type ActorContextValue = {
  actorId: ActorId;
  actor: Actor;
  setActorId: (id: ActorId) => void;
};

const ActorContext = React.createContext<ActorContextValue | null>(null);

function readActorFromDocument(): ActorId {
  if (typeof document === "undefined") return "appraiser";
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ACTOR_COOKIE}=`));
  if (!match) return "appraiser";
  return parseActorId(
    decodeURIComponent(match.slice(ACTOR_COOKIE.length + 1)),
  );
}

export function ActorProvider({ children }: { children: React.ReactNode }) {
  const [actorId, setActorIdState] = React.useState<ActorId>(() =>
    readActorFromDocument(),
  );

  const setActorId = React.useCallback((id: ActorId) => {
    document.cookie = `${ACTOR_COOKIE}=${encodeURIComponent(id)}; path=/; SameSite=Lax`;
    setActorIdState(id);
  }, []);

  const value = React.useMemo(
    () => ({
      actorId,
      actor: ACTORS[actorId],
      setActorId,
    }),
    [actorId, setActorId],
  );

  return (
    <ActorContext.Provider value={value}>{children}</ActorContext.Provider>
  );
}

export function useActor(): ActorContextValue {
  const ctx = React.useContext(ActorContext);
  if (!ctx) throw new Error("useActor outside provider");
  return ctx;
}
