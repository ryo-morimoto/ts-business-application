import type { ReactNode } from "react";

export function DefinitionList({
  items,
}: {
  items: { term: string; description: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
      {items.map((item) => (
        <div key={item.term} className="contents">
          <dt className="text-xs font-semibold text-desk-muted">{item.term}</dt>
          <dd className="text-sm text-desk-text">{item.description ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
