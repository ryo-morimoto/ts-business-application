import { z } from "zod";
import { ALLOWED_ORDER_LIST_FILTERS, orderStatusSchema } from "./order";
import { externalSystemSchema } from "./provenance";

/**
 * Structured errors the BFF returns to the UI.
 * External OMS / inventory failures are mapped into these codes — never raw foreign payloads.
 */
export const appErrorCodeSchema = z.enum([
  "invalid_body",
  "unsupported_filter",
  "missing_permission",
  "wrong_state",
  "not_found",
  "inventory_shortage",
  "external_rate_limited",
  "external_timeout",
  "external_validation",
  "external_unavailable",
  /** Composition stopped because a dependency SoR failed mid-pipeline. */
  "composition_failed",
]);

export type AppErrorCode = z.infer<typeof appErrorCodeSchema>;

export const appErrorSchema = z.object({
  error: z.literal("app_error"),
  code: appErrorCodeSchema,
  message: z.string().min(1),
  correlationId: z.string().optional(),
  /** Which filters the external SoR accepts (when code = unsupported_filter). */
  allowedFilters: z.array(z.enum(ALLOWED_ORDER_LIST_FILTERS)).optional(),
  rejectedFilters: z.array(z.string()).optional(),
  currentStatus: orderStatusSchema.optional(),
  shortages: z
    .array(
      z.object({
        sku: z.string(),
        requested: z.number().int(),
        available: z.number().int(),
      }),
    )
    .optional(),
  /** Seconds the client should wait (from foreign retry_after_sec). */
  retryAfterSec: z.number().int().positive().optional(),
  /** Which SoR step failed during multi-call composition. */
  failedSystem: externalSystemSchema.optional(),
  failedOperation: z.string().optional(),
  externalCode: z.string().optional(),
});

export type AppError = z.infer<typeof appErrorSchema>;
