type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "bg-desk-bg text-desk-text border-desk-border",
  success: "bg-desk-success-bg text-desk-success border-desk-success",
  warning: "bg-desk-warning-bg text-desk-warning border-desk-warning",
  danger: "bg-desk-danger-bg text-desk-danger border-desk-danger",
  info: "bg-desk-info-bg text-desk-info border-desk-info",
};

export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span
      className={[
        "inline-flex items-center border px-1.5 py-0.5 text-xs font-semibold",
        "rounded-[var(--radius-control)]",
        toneClass[tone],
      ].join(" ")}
    >
      {label}
    </span>
  );
}

/** At most two chips — avoids badge party in list cells. */
export function StatusCluster({
  items,
}: {
  items: { label: string; tone?: Tone }[];
}) {
  const shown = items.slice(0, 2);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {shown.map((item) => (
        <StatusChip key={item.label} label={item.label} tone={item.tone} />
      ))}
    </span>
  );
}
