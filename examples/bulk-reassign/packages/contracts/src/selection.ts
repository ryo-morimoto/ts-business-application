import { z } from "zod";
import { customerFilterSchema, customerIdSchema } from "./customer";

export const selectionScopeSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("page"),
    ids: z.array(customerIdSchema).min(1),
  }),
  z.object({
    mode: z.literal("all_matching"),
    filter: customerFilterSchema,
    excludedIds: z.array(customerIdSchema).default([]),
    /** Client hint for UI; server recomputes actual targets. */
    estimatedCount: z.number().int().nonnegative(),
  }),
]);

export type SelectionScope = z.infer<typeof selectionScopeSchema>;
