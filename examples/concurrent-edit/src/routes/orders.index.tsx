import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orderQueries } from "~/features/orders/api/orders.queries";
import { OrderList } from "~/features/orders/ui/order-list";

export const Route = createFileRoute("/orders/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(orderQueries.list()),
  component: OrdersIndexPage,
});

function OrdersIndexPage() {
  // Observer keeps the query active (TkDodo: do not rely on useLoaderData alone).
  useSuspenseQuery(orderQueries.list());

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Orders</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Open an order to edit header + lines. Concurrent saves with a stale{" "}
        <code className="font-mono">expectedVersion</code> surface a conflict.
      </p>
      <OrderList />
    </section>
  );
}
