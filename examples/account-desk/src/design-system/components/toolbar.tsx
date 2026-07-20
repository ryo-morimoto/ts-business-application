import type { ReactNode } from "react";

export function Toolbar({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      className="sticky top-0 z-10 flex flex-col gap-2 border border-desk-border bg-desk-surface p-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
      role="search"
    >
      <div className="flex flex-1 flex-wrap items-end gap-2">{children}</div>
      {trailing ? <div className="flex flex-wrap gap-2">{trailing}</div> : null}
    </div>
  );
}
