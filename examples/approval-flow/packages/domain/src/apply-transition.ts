import {
  actionTargetStatus,
  type ApprovalRequest,
  type TransitionAction,
} from "@approval-flow/contracts";
import type { Actor } from "./actor";
import { canTransition } from "./can-transition";

export type ApplyTransitionInput = {
  request: ApprovalRequest | undefined;
  action: TransitionAction;
  actor: Actor;
  reason?: string;
  now?: string;
};

export type ApplyTransitionResult =
  | { ok: true; request: ApprovalRequest }
  | {
      ok: false;
      reason: import("@approval-flow/contracts").TransitionDeniedReason;
    };

export function applyTransition(
  input: ApplyTransitionInput,
): ApplyTransitionResult {
  const check = canTransition(input);
  if (!check.ok) {
    return check;
  }

  const request = input.request!;
  const status = actionTargetStatus[input.action];
  const now = input.now ?? new Date().toISOString();

  return {
    ok: true,
    request: {
      ...request,
      status,
      rejectReason:
        input.action === "reject"
          ? (input.reason?.trim() ?? null)
          : input.action === "resubmit"
            ? null
            : request.rejectReason,
      updatedAt: now,
    },
  };
}
