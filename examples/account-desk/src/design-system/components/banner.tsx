import type { ReactNode } from "react";

type Tone = "info" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  info: "border-desk-info bg-desk-info-bg text-desk-text",
  warning: "border-desk-warning bg-desk-warning-bg text-desk-text",
  danger: "border-desk-danger bg-desk-danger-bg text-desk-text",
};

export function Banner({
  tone = "warning",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={[
        "border-l-4 border px-3 py-2 text-sm",
        toneClass[tone],
      ].join(" ")}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
