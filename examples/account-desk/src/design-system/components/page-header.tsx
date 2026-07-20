import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-desk-border pb-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-desk-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-lg font-semibold text-desk-text">{title}</h1>
        {description ? (
          <div className="text-xs text-desk-muted">{description}</div>
        ) : null}
        {meta ? <div className="pt-1">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
