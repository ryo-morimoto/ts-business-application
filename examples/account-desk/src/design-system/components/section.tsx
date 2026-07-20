import type { ReactNode } from "react";

export function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border border-desk-border bg-desk-surface p-4"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className="mb-3 border-b border-desk-border pb-2">
        <h2
          id={id ? `${id}-title` : undefined}
          className="text-sm font-semibold text-desk-text"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs text-desk-muted">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
