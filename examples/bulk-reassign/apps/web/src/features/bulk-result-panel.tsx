import type { BulkAssignResult } from "@bulk-reassign/contracts";

type Props = {
  result: BulkAssignResult | null;
};

export function BulkResultPanel({ result }: Props) {
  if (!result) return null;

  const success = result.succeeded.length;
  const fail = result.failed.length;
  const kind =
    success > 0 && fail > 0 ? "partial" : fail === 0 ? "ok" : "fail";

  return (
    <section
      className={`result ${kind}`}
      aria-live="polite"
      data-testid="bulk-result"
    >
      <div>
        Request <code>{result.requestId}</code>:{" "}
        <strong>{success}</strong> succeeded, <strong>{fail}</strong> failed
        {kind === "partial" ? " (partial — no silent skip)" : null}
      </div>
      {fail > 0 ? (
        <ul>
          {result.failed.map((f) => (
            <li key={f.id}>
              <code>{f.id}</code>: {f.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
