import { createFileRoute } from "@tanstack/react-router";
import { sateiQueries } from "~/features/satei/api/satei.queries";
import { TicketWorkbench } from "~/features/satei/ui/ticket-workbench";

export const Route = createFileRoute("/tickets/$ticketId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      sateiQueries.ticket(params.ticketId),
    ),
  component: TicketDetailPage,
});

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  return <TicketWorkbench ticketId={ticketId} />;
}
