import { createFileRoute } from "@tanstack/react-router";
import { resetOrderStore } from "~/features/orders/api/orders.server";

export const Route = createFileRoute("/api/testing/reset")({
  server: {
    handlers: {
      POST: async () => {
        resetOrderStore();
        return Response.json({ ok: true });
      },
    },
  },
});
