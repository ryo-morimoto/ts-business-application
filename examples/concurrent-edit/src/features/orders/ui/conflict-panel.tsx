import type { Order } from "../model/schemas";
import type { OrderFormValues } from "../model/schemas";
import { orderTotal } from "../model/apply-update";

type Props = {
  yourExpected: number;
  current: Order;
  yours: OrderFormValues;
  onReloadServer: () => void;
  onKeepMineRebase: () => void;
};

export function ConflictPanel({
  yourExpected,
  current,
  yours,
  onReloadServer,
  onKeepMineRebase,
}: Props) {
  return (
    <div
      className="rounded border border-amber-400 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950/40"
      data-testid="conflict-panel"
      role="alert"
    >
      <h2 className="text-base font-semibold text-amber-900 dark:text-amber-100">
        Version conflict (not last-write-wins)
      </h2>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        You tried to save with <code className="font-mono">expectedVersion={yourExpected}</code>,
        but the server is already at{" "}
        <code className="font-mono" data-testid="conflict-server-version">
          v{current.version}
        </code>{" "}
        (last by {current.updatedBy}).
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-gray-950">
          <h3 className="font-semibold">Your draft (not applied)</h3>
          <p className="mt-1">Customer: {yours.customerName}</p>
          <p>Note: {yours.note || "—"}</p>
          <p>Lines: {yours.lines.length}</p>
          <p>Total: {orderTotal({ lines: yours.lines }).toFixed(2)}</p>
        </div>
        <div className="rounded border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-gray-950">
          <h3 className="font-semibold">Server current</h3>
          <p className="mt-1" data-testid="conflict-server-customer">
            Customer: {current.customerName}
          </p>
          <p>Note: {current.note || "—"}</p>
          <p>Lines: {current.lines.length}</p>
          <p>Total: {orderTotal(current).toFixed(2)}</p>
          <p className="font-mono text-xs text-gray-500">
            updated {current.updatedAt}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-amber-800 px-3 py-1.5 text-white"
          data-testid="conflict-reload"
          onClick={onReloadServer}
        >
          Discard mine · load server
        </button>
        <button
          type="button"
          className="rounded border border-amber-800 px-3 py-1.5 text-amber-900 dark:text-amber-100"
          data-testid="conflict-rebase"
          onClick={onKeepMineRebase}
        >
          Keep mine · rebase to v{current.version}
        </button>
      </div>
      <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-100/70">
        Rebase updates the expected version only; you must submit again. Server data is not
        overwritten until a matching version succeeds.
      </p>
    </div>
  );
}
