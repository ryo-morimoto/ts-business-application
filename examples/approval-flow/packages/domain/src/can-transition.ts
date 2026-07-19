import type {
  ApprovalRequest,
  TransitionAction,
  TransitionDeniedReason,
} from "@approval-flow/contracts";
import type { Actor } from "./actor";

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: TransitionDeniedReason };

const allowedFrom: Record<TransitionAction, ApprovalRequest["status"][]> = {
  submit: ["draft"],
  approve: ["submitted"],
  reject: ["submitted"],
  resubmit: ["rejected"],
};

function hasPermission(actor: Actor, action: TransitionAction): boolean {
  if (actor.role === "admin") return true;
  if (actor.role === "author") {
    return action === "submit" || action === "resubmit";
  }
  if (actor.role === "reviewer") {
    return action === "approve" || action === "reject";
  }
  return false;
}

/**
 * Pure guard: state machine + permission + reject reason + ownership for author actions.
 */
export function canTransition(input: {
  request: ApprovalRequest | undefined;
  action: TransitionAction;
  actor: Actor;
  reason?: string;
}): TransitionCheck {
  const { request, action, actor, reason } = input;

  if (!request) {
    return { ok: false, reason: "not_found" };
  }

  if (!hasPermission(actor, action)) {
    return { ok: false, reason: "missing_permission" };
  }

  if (
    (action === "submit" || action === "resubmit") &&
    actor.role === "author" &&
    request.authorId !== actor.id
  ) {
    return { ok: false, reason: "not_owner" };
  }

  if (!allowedFrom[action].includes(request.status)) {
    return { ok: false, reason: "wrong_state" };
  }

  if (action === "reject" && (!reason || reason.trim().length === 0)) {
    return { ok: false, reason: "reason_required" };
  }

  return { ok: true };
}
