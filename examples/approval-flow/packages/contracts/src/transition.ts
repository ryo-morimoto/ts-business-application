import { z } from "zod";
import { requestStatusSchema } from "./request";

export const transitionActionSchema = z.enum([
  "submit",
  "approve",
  "reject",
  "resubmit",
]);

export type TransitionAction = z.infer<typeof transitionActionSchema>;

export const transitionBodySchema = z.object({
  action: transitionActionSchema,
  reason: z.string().optional(),
});

export type TransitionBody = z.infer<typeof transitionBodySchema>;

export const transitionDeniedReasonSchema = z.enum([
  "missing_permission",
  "wrong_state",
  "reason_required",
  "not_found",
  "not_owner",
]);

export type TransitionDeniedReason = z.infer<
  typeof transitionDeniedReasonSchema
>;

export const transitionErrorSchema = z.object({
  error: z.literal("transition_denied"),
  reason: transitionDeniedReasonSchema,
  currentStatus: requestStatusSchema.optional(),
  action: transitionActionSchema.optional(),
});

export type TransitionError = z.infer<typeof transitionErrorSchema>;

/** Target status after a successful action. */
export const actionTargetStatus: Record<
  TransitionAction,
  z.infer<typeof requestStatusSchema>
> = {
  submit: "submitted",
  approve: "approved",
  reject: "rejected",
  resubmit: "submitted",
};
