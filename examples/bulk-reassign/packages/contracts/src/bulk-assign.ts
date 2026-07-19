import { z } from "zod";
import { actionDeniedReasonSchema } from "./action-policy";
import { customerIdSchema } from "./customer";
import { selectionScopeSchema } from "./selection";

export const bulkAssignRequestSchema = z.object({
  requestId: z.string().min(1),
  assigneeId: z.string().min(1),
  scope: selectionScopeSchema,
});

export type BulkAssignRequest = z.infer<typeof bulkAssignRequestSchema>;

export const bulkAssignFailureReasonSchema = z.union([
  actionDeniedReasonSchema,
  z.enum(["not_found", "conflict"]),
]);

export type BulkAssignFailureReason = z.infer<
  typeof bulkAssignFailureReasonSchema
>;

export const bulkAssignFailureSchema = z.object({
  id: customerIdSchema,
  reason: bulkAssignFailureReasonSchema,
});

export type BulkAssignFailure = z.infer<typeof bulkAssignFailureSchema>;

export const bulkAssignResultSchema = z.object({
  requestId: z.string().min(1),
  succeeded: z.array(z.object({ id: customerIdSchema })),
  failed: z.array(bulkAssignFailureSchema),
});

export type BulkAssignResult = z.infer<typeof bulkAssignResultSchema>;
