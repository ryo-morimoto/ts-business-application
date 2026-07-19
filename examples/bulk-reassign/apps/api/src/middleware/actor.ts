import { createMiddleware } from "hono/factory";
import type { Actor } from "@bulk-reassign/domain";

export type AppEnv = {
  Variables: {
    actor: Actor;
  };
};

export const actorMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const actorId = c.req.header("x-actor-id")?.trim() || "agent-a";
  c.set("actor", { id: actorId });
  await next();
});
