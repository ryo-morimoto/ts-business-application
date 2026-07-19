import { createFileRoute } from "@tanstack/react-router";
import { TicketList } from "~/features/satei/ui/ticket-list";
import { sateiQueries } from "~/features/satei/api/satei.queries";

export const Route = createFileRoute("/tickets/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(sateiQueries.tickets()),
  component: TicketsPage,
});

function TicketsPage() {
  return <TicketList />;
}
