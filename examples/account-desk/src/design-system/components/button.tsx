import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-desk-focus text-white border-desk-focus hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-desk-surface text-desk-text border-desk-border hover:bg-desk-bg disabled:opacity-50",
  danger:
    "bg-desk-danger text-white border-desk-danger hover:opacity-90 disabled:opacity-50",
  ghost:
    "bg-transparent text-desk-link border-transparent hover:underline disabled:opacity-50",
};

export function Button({
  variant = "secondary",
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-1 border px-3 py-1.5 text-sm font-semibold",
        "rounded-[var(--radius-control)]",
        variantClass[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
