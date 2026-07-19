import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { createTicketFn } from "../api/satei.functions";
import { sateiQueries } from "../api/satei.queries";
import type { Ticket } from "../model/types";
import { useActor } from "~/shared/actor/actor-context";

const col = createColumnHelper<Ticket>();

export function TicketList() {
  const { actor } = useActor();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tickets } = useSuspenseQuery(sateiQueries.tickets());

  const createMut = useMutation({
    mutationFn: async () => {
      const result = await createTicketFn({ data: { channel: "store" } });
      if (!result.ok) {
        throw new Error(`${result.code}: ${result.message}`);
      }
      return result.value;
    },
    onSuccess: async (view) => {
      // Seed detail cache so the ticket page loader does not race empty SoR views.
      qc.setQueryData(sateiQueries.ticket(view.ticket.id).queryKey, view);
      await qc.invalidateQueries({ queryKey: ["satei", "tickets"] });
      await navigate({
        to: "/tickets/$ticketId",
        params: { ticketId: view.ticket.id },
      });
    },
  });

  const table = useReactTable({
    data: tickets,
    columns: [
      col.accessor("id", {
        header: "ID",
        cell: (info) => (
          <Link
            to="/tickets/$ticketId"
            params={{ ticketId: info.getValue() }}
            className="font-mono text-blue-700 underline dark:text-blue-300"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      col.accessor("status", { header: "Status" }),
      col.accessor("channel", { header: "Channel" }),
      col.accessor("ruleSetVersion", {
        header: "Pin RS",
        cell: (i) => `v${i.getValue()}`,
      }),
      col.accessor((r) => r.lines.length, { id: "lines", header: "Lines" }),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-3" data-testid="ticket-list">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">査定チケット</h2>
        <button
          type="button"
          data-testid="create-ticket"
          className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={actor.role === "viewer" || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? "作成中…" : "新規 (店頭)"}
        </button>
      </div>
      {createMut.isError && (
        <p className="text-sm text-red-600" data-testid="create-error">
          {createMut.error instanceof Error
            ? createMut.error.message
            : "create failed"}
        </p>
      )}
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={5}>
                  チケットなし。新規作成してください。
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
