import { z } from "zod";

export const actionDeniedReasonSchema = z.enum([
  "missing_permission",
  "wrong_state",
  "plan_limit",
  "wrong_tenant",
]);

export type ActionDeniedReason = z.infer<typeof actionDeniedReasonSchema>;

export const actionPolicySchema = z.discriminatedUnion("allowed", [
  z.object({ allowed: z.literal(true) }),
  z.object({
    allowed: z.literal(false),
    reason: actionDeniedReasonSchema,
  }),
]);

export type ActionPolicy = z.infer<typeof actionPolicySchema>;
