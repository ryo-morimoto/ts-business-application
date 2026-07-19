import { z } from "zod";

/** Which external System of Record a BFF step talked to. */
export const externalSystemSchema = z.enum(["oms", "customer", "inventory"]);

export type ExternalSystem = z.infer<typeof externalSystemSchema>;

/**
 * One outbound call the BFF made while serving a request.
 * Makes composition observable — not a raw foreign payload dump.
 */
export const externalCallRecordSchema = z.object({
  system: externalSystemSchema,
  operation: z.string().min(1),
  ok: z.boolean(),
  durationMs: z.number().nonnegative(),
});

export type ExternalCallRecord = z.infer<typeof externalCallRecordSchema>;

export const compositionProvenanceSchema = z.object({
  correlationId: z.string().min(1),
  /** Wall time for the whole BFF orchestration (not one SoR). */
  totalDurationMs: z.number().nonnegative(),
  calls: z.array(externalCallRecordSchema),
});

export type CompositionProvenance = z.infer<typeof compositionProvenanceSchema>;
