import { Hono } from "hono";
import { cors } from "hono/cors";
import { actorMiddleware, type AppEnv } from "./middleware/actor";
import { bulkAssignRoute } from "./routes/bulk-assign";
import { customersRoute } from "./routes/customers";
import { resetCustomers } from "./store/customers";
import { resetIdempotency } from "./store/idempotency";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use(
    "*",
    cors({
      origin: [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3010",
        "http://localhost:3010",
      ],
      allowHeaders: ["Content-Type", "x-actor-id"],
    }),
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "@bulk-reassign/api",
      example: "bulk-reassign",
    }),
  );

  /** Sandbox-only: reset fixtures between e2e runs. */
  app.post("/__test__/reset", (c) => {
    resetCustomers();
    resetIdempotency();
    return c.json({ ok: true });
  });

  app.use("*", actorMiddleware);
  app.route("/customers", customersRoute);
  app.route("/bulk-assign", bulkAssignRoute);

  return app;
}

export type App = ReturnType<typeof createApp>;
