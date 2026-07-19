import type { DraftRecord, PurchaseRequestRecord } from "./store";
import type { DraftPayload, StepId, SubmitPayload } from "./schemas";
import { submitSchema } from "./schemas";

export type DraftView = {
  kind: "draft";
  id: string;
  ownerId: string;
  status: "open" | "submitted";
  payload: DraftPayload;
  lastStepId: StepId;
  updatedAt: string;
  submittedId?: string;
  /** Fields still missing for submit (for review UI) */
  readiness: { ready: boolean; missing: string[] };
};

export type SubmittedView = {
  kind: "submitted";
  id: string;
  draftId: string;
  ownerId: string;
  payload: SubmitPayload;
  submittedAt: string;
};

export function readinessOf(payload: DraftPayload): {
  ready: boolean;
  missing: string[];
} {
  const parsed = submitSchema.safeParse({
    title: payload.title,
    vendorName: payload.vendorName,
    neededBy: payload.neededBy,
    note: payload.note,
    lines: payload.lines,
  });
  if (parsed.success) return { ready: true, missing: [] };

  const missing = new Set<string>();
  for (const issue of parsed.error.issues) {
    const path = issue.path.map(String).join(".") || "_form";
    missing.add(path);
  }
  return { ready: false, missing: [...missing] };
}

export function toDraftView(record: DraftRecord): DraftView {
  return {
    kind: "draft",
    id: record.id,
    ownerId: record.ownerId,
    status: record.status,
    payload: record.payload,
    lastStepId: record.lastStepId,
    updatedAt: record.updatedAt,
    submittedId: record.submittedId,
    readiness: readinessOf(record.payload),
  };
}

export function toSubmittedView(
  record: PurchaseRequestRecord,
): SubmittedView {
  return {
    kind: "submitted",
    id: record.id,
    draftId: record.draftId,
    ownerId: record.ownerId,
    payload: record.payload,
    submittedAt: record.submittedAt,
  };
}
