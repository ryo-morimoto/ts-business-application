import type { ForeignError } from "@fulfillment-desk/domain";
import type { ExternalCallOptions, ExternalResult } from "./types";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Run a foreign SoR operation with optional latency + budget.
 * Budget covers latency + execute; overrun → foreign `timeout`.
 */
export async function runForeignCall<T>(
  opts: ExternalCallOptions | undefined,
  execute: () => ExternalResult<T> | Promise<ExternalResult<T>>,
): Promise<ExternalResult<T>> {
  const latencyMs = opts?.latencyMs ?? 0;
  const budgetMs = opts?.budgetMs;

  const work = (async (): Promise<ExternalResult<T>> => {
    if (latencyMs > 0) {
      await sleep(latencyMs);
    }
    return execute();
  })();

  if (budgetMs === undefined) {
    return work;
  }

  const winner = await Promise.race([
    work.then((r) => ({ kind: "work" as const, r })),
    sleep(budgetMs).then(() => ({ kind: "timeout" as const })),
  ]);

  if (winner.kind === "timeout") {
    const err: ForeignError = {
      err_code: "timeout",
      err_msg: `external call exceeded budget_ms=${budgetMs}`,
    };
    return { ok: false, error: err };
  }

  return winner.r;
}
