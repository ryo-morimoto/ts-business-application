import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACTOR_COOKIE,
  ACTORS,
  parseActorId,
  type Actor,
  type ActorId,
} from "./actor";

function readCookie(): ActorId {
  if (typeof document === "undefined") return "alice";
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ACTOR_COOKIE}=`));
  if (!match) return "alice";
  return parseActorId(decodeURIComponent(match.split("=").slice(1).join("=")));
}

function writeCookie(id: ActorId) {
  document.cookie = `${ACTOR_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
}

const Ctx = createContext<{
  actorId: ActorId;
  actor: Actor;
  setActorId: (id: ActorId) => void;
} | null>(null);

export function ActorProvider({ children }: { children: ReactNode }) {
  // SSR defaults to alice; client re-reads cookie after mount (hydration).
  const [actorId, setActorIdState] = useState<ActorId>("alice");

  useEffect(() => {
    setActorIdState(readCookie());
  }, []);

  const setActorId = useCallback((id: ActorId) => {
    writeCookie(id);
    setActorIdState(id);
  }, []);

  const value = useMemo(
    () => ({ actorId, actor: ACTORS[actorId], setActorId }),
    [actorId, setActorId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActor() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("ActorProvider missing");
  return ctx;
}
