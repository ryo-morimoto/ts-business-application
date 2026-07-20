import { createFileRoute } from "@tanstack/react-router";
import { resetAccountStore } from "~/features/accounts/api/accounts.server";

export const Route = createFileRoute("/api/testing/reset")({
  server: {
    handlers: {
      POST: async () => {
        resetAccountStore();
        return Response.json({ ok: true });
      },
    },
  },
});
