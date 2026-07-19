import { serve } from "@hono/node-server";
import { createApp } from "./app";

const port = Number(process.env.API_PORT ?? 8788);
const host = process.env.API_HOST ?? "127.0.0.1";

const app = createApp();

serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  console.log(
    `@bulk-reassign/api listening on http://${info.address}:${info.port}`,
  );
});
