import type {
  CompositionProvenance,
  ExternalCallRecord,
  ExternalSystem,
} from "@fulfillment-desk/contracts";

/** Mutable collector used only inside BFF orchestration; pure freeze at the end. */
export class ProvenanceCollector {
  readonly correlationId: string;
  private readonly startedAt: number;
  private readonly calls: ExternalCallRecord[] = [];
  private readonly now: () => number;

  constructor(correlationId: string, now: () => number = () => Date.now()) {
    this.correlationId = correlationId;
    this.now = now;
    this.startedAt = now();
  }

  record(input: {
    system: ExternalSystem;
    operation: string;
    ok: boolean;
    durationMs: number;
  }): void {
    this.calls.push({
      system: input.system,
      operation: input.operation,
      ok: input.ok,
      durationMs: input.durationMs,
    });
  }

  freeze(): CompositionProvenance {
    return {
      correlationId: this.correlationId,
      totalDurationMs: Math.max(0, this.now() - this.startedAt),
      calls: [...this.calls],
    };
  }
}

export function newCorrelationId(random = Math.random): string {
  const hex = random().toString(16).slice(2, 10);
  return `corr_${hex}`;
}
