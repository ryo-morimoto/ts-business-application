import { createFileRoute } from "@tanstack/react-router";
import { resetSateiStore } from "~/features/satei/api/satei.server";

export const Route = createFileRoute("/api/testing/reset")({
  server: {
    handlers: {
      POST: async () => {
        resetSateiStore();
        return Response.json({ ok: true });
      },
    },
  },
});
