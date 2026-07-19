"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Customer } from "@bulk-reassign/contracts";
import { useMemo } from "react";

const columnHelper = createColumnHelper<Customer>();

type Props = {
  rows: Customer[];
  selectedIds: Set<string>;
  selectionMode: "page" | "all_matching";
  onToggleId: (id: string) => void;
  onTogglePage: (ids: string[], checked: boolean) => void;
};

export function CustomerTable({
  rows,
  selectedIds,
  selectionMode,
  onToggleId,
  onTogglePage,
}: Props) {
  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => (
          <input
            type="checkbox"
            aria-label="Select all on this page"
            checked={allPageSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allPageSelected && somePageSelected;
            }}
            disabled={selectionMode === "all_matching"}
            onChange={(e) => onTogglePage(pageIds, e.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.name}`}
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleId(row.original.id)}
          />
        ),
      }),
      columnHelper.accessor("id", { header: "ID" }),
      columnHelper.accessor("name", { header: "Name" }),
      columnHelper.accessor("assigneeId", {
        header: "Assignee",
        cell: (info) => info.getValue() ?? "—",
      }),
    ],
    [
      allPageSelected,
      somePageSelected,
      selectionMode,
      selectedIds,
      pageIds,
      onToggleId,
      onTogglePage,
    ],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((h) => (
              <th key={h.id}>
                {h.isPlaceholder
                  ? null
                  : flexRender(h.column.columnDef.header, h.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
