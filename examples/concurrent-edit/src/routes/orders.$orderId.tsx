import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { forcePeerSaveFn } from "~/features/orders/api/orders.functions";
import { orderQueries } from "~/features/orders/api/orders.queries";
import { OrderEditForm } from "~/features/orders/ui/order-edit-form";
import type { Order } from "~/features/orders/model/schemas";
import { useActor } from "~/shared/actor/actor-context";

export const Route = createFileRoute("/orders/$orderId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(orderQueries.detail(params.orderId)),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const query = useSuspenseQuery(orderQueries.detail(orderId));
  /**
   * Form baseline is local. Peer saves must NOT replace this — that would refresh
   * expectedVersion and hide the conflict. Only explicit reload / successful save replace it.
   */
  const [baseline, setBaseline] = useState<Order>(() => query.data);
  const [peerNote, setPeerNote] = useState<string | null>(null);
  const { actorId, actor } = useActor();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            to="/orders"
            className="text-sm text-blue-700 underline dark:text-blue-300"
          >
            ← Orders
          </Link>
          <h2 className="text-lg font-semibold font-mono">{orderId}</h2>
        </div>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
          data-testid="simulate-peer-save"
          onClick={async () => {
            const peer = actorId === "bob" ? "alice" : "bob";
            const result = await forcePeerSaveFn({
              data: {
                id: orderId,
                actorId: peer,
                customerName: `${baseline.customerName} [peer ${peer}]`,
              },
            });
            if (result.ok) {
              setPeerNote(
                `Peer ${peer} saved server to v${result.order.version}. Your form still targets v${baseline.version}.`,
              );
            } else {
              setPeerNote(`Peer save failed: ${result.code}`);
            }
          }}
        >
          Simulate peer save (advance version)
        </button>
      </div>

      {peerNote ? (
        <p
          className="text-sm text-purple-800 dark:text-purple-300"
          data-testid="peer-note"
        >
          {peerNote}
        </p>
      ) : null}

      <OrderEditForm
        // Remount only when switching order or actor — not after every save
        // (save success must keep status message / expectedVersion in form state).
        key={`${baseline.id}:${actor.id}`}
        order={baseline}
        actor={actor}
        onOrderReplaced={(next) => {
          setBaseline(next);
          setPeerNote(null);
        }}
      />
    </section>
  );
}
