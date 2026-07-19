import type { DraftPayload, StepId, SubmitPayload } from "./schemas";

export type DraftRecord = {
  id: string;
  ownerId: string;
  status: "open" | "submitted";
  payload: DraftPayload;
  lastStepId: StepId;
  updatedAt: string;
  submittedId?: string;
};

export type PurchaseRequestRecord = {
  id: string;
  draftId: string;
  ownerId: string;
  payload: SubmitPayload;
  submittedAt: string;
};

let draftSeq = 0;
let prSeq = 0;
const drafts = new Map<string, DraftRecord>();
const purchaseRequests = new Map<string, PurchaseRequestRecord>();

export function resetStore(): void {
  draftSeq = 0;
  prSeq = 0;
  drafts.clear();
  purchaseRequests.clear();
}

export function newDraftId(): string {
  draftSeq += 1;
  return `drf_${String(draftSeq).padStart(3, "0")}`;
}

export function newPrId(): string {
  prSeq += 1;
  return `pr_${String(prSeq).padStart(3, "0")}`;
}

export function putDraft(record: DraftRecord): void {
  drafts.set(record.id, record);
}

export function getDraftRecord(id: string): DraftRecord | undefined {
  return drafts.get(id);
}

export function listDraftRecords(): DraftRecord[] {
  return [...drafts.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function putPurchaseRequest(record: PurchaseRequestRecord): void {
  purchaseRequests.set(record.id, record);
}

export function getPurchaseRequestRecord(
  id: string,
): PurchaseRequestRecord | undefined {
  return purchaseRequests.get(id);
}
