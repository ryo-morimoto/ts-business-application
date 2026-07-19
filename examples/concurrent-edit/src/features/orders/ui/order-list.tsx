import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { orderQueries } from "../api/orders.queries";
import type { OrderListItem } from "../model/schemas";

const columnHelper = createColumnHelper<OrderListItem>();

const columns = [
  columnHelper.accessor("id", {
    header: "Order",
    cell: (info) => (
      <Link
        to="/orders/$orderId"
        params={{ orderId: info.getValue() }}
        className="font-mono text-blue-700 underline dark:text-blue-300"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("customerName", { header: "Customer" }),
  columnHelper.accessor("version", {
    header: "Version",
    cell: (info) => (
      <span className="font-mono" data-testid={`list-version-${info.row.original.id}`}>
        v{info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("lineCount", { header: "Lines" }),
  columnHelper.accessor("total", {
    header: "Total",
    cell: (info) => info.getValue().toFixed(2),
  }),
  columnHelper.accessor("updatedBy", { header: "Updated by" }),
];

export function OrderList() {
  const { data } = useSuspenseQuery(orderQueries.list());
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <table className="min-w-full text-left text-sm" data-testid="order-list">
        <thead className="bg-gray-100 dark:bg-gray-800">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 font-semibold">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-gray-100 dark:border-gray-800"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
