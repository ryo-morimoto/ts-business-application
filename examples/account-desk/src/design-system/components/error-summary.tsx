/** GOV.UK-style error summary: list + jump links to field ids. */

export type ErrorSummaryItem = {
  id: string;
  message: string;
};

export function ErrorSummary({
  title = "入力内容を確認してください",
  errors,
}: {
  title?: string;
  errors: ErrorSummaryItem[];
}) {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      tabIndex={-1}
      className="border border-desk-danger bg-desk-danger-bg px-3 py-3"
      data-testid="error-summary"
    >
      <h2 className="text-sm font-semibold text-desk-danger">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {errors.map((err) => (
          <li key={err.id}>
            <a href={`#${err.id}`} className="text-desk-danger underline">
              {err.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
