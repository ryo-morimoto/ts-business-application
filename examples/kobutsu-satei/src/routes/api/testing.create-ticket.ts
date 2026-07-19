import { createFileRoute } from "@tanstack/react-router";
import { createTicket } from "~/features/satei/api/satei.server";
import { ACTORS } from "~/shared/actor/actor";

export const Route = createFileRoute("/api/testing/create-ticket")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let channel: "store" | "mail_in" = "store";
        try {
          const body = (await request.json()) as { channel?: string };
          if (body.channel === "mail_in" || body.channel === "store") {
            channel = body.channel;
          }
        } catch {
          // empty body ok
        }
        const result = createTicket(ACTORS.appraiser, { channel });
        if (!result.ok) {
          return Response.json(result, { status: 400 });
        }
        return Response.json({
          ok: true,
          id: result.value.ticket.id,
          ticket: result.value.ticket,
        });
      },
    },
  },
});
