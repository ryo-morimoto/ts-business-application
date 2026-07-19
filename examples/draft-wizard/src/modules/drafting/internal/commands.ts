import type { Actor } from "@/shared/actor";
import {
  err,
  zodToFieldErrors,
  type ErrResult,
  type Result,
} from "@/shared/http/result";
import { canReadDraft, canWriteDraft } from "./authorize";
import { mergePayload } from "./merge";
import {
  draftPatchSchema,
  stepBasicsSchema,
  stepIdSchema,
  stepLinesSchema,
  submitSchema,
  type DraftPatch,
  type StepId,
} from "./schemas";
import { nextStep } from "./steps";
import {
  getDraftRecord,
  getPurchaseRequestRecord,
  listDraftRecords,
  newDraftId,
  newPrId,
  putDraft,
  putPurchaseRequest,
  type DraftRecord,
} from "./store";
import {
  toDraftView,
  toSubmittedView,
  type DraftView,
  type SubmittedView,
} from "./views";

function now(): string {
  return new Date().toISOString();
}

function assertOpenWritable(
  actor: Actor,
  record: DraftRecord | undefined,
): Result<{ record: DraftRecord }> {
  if (!record) return err("not_found", "Draft が見つかりません");
  if (!canWriteDraft(actor, record.ownerId)) {
    return err("forbidden", "この draft を編集する権限がありません");
  }
  if (record.status !== "open") {
    return err(
      "already_submitted",
      "提出済みの draft は変更できません",
    );
  }
  return { ok: true, record };
}

export function create(actor: Actor): Result<{ draft: DraftView }> {
  if (!actor.canWrite) {
    return err("forbidden", "draft を作成する権限がありません");
  }
  const record: DraftRecord = {
    id: newDraftId(),
    ownerId: actor.id,
    status: "open",
    payload: {},
    lastStepId: "basics",
    updatedAt: now(),
  };
  putDraft(record);
  return { ok: true, draft: toDraftView(record) };
}

export function get(
  actor: Actor,
  id: string,
): Result<{ view: DraftView | SubmittedView }> {
  const record = getDraftRecord(id);
  if (!record) return err("not_found", "Draft が見つかりません");
  if (!canReadDraft(actor, record.ownerId)) {
    return err("forbidden", "この draft を閲覧する権限がありません");
  }
  if (record.status === "submitted" && record.submittedId) {
    const pr = getPurchaseRequestRecord(record.submittedId);
    if (pr) return { ok: true, view: toSubmittedView(pr) };
  }
  return { ok: true, view: toDraftView(record) };
}

export function list(actor: Actor): Result<{ drafts: DraftView[] }> {
  const all = listDraftRecords().filter((d) =>
    canReadDraft(actor, d.ownerId),
  );
  return { ok: true, drafts: all.map(toDraftView) };
}

export function save(
  actor: Actor,
  id: string,
  rawPatch: unknown,
): Result<{ draft: DraftView }> {
  const gate = assertOpenWritable(actor, getDraftRecord(id));
  if (!gate.ok) return gate;

  const parsed = draftPatchSchema.safeParse(rawPatch);
  if (!parsed.success) {
    return err(
      "validation_failed",
      "保存データが不正です",
      zodToFieldErrors(parsed.error.issues),
    );
  }

  const record = gate.record;
  const next: DraftRecord = {
    ...record,
    payload: mergePayload(record.payload, parsed.data as DraftPatch),
    updatedAt: now(),
  };
  putDraft(next);
  return { ok: true, draft: toDraftView(next) };
}

function assertStepPayload(
  stepId: StepId,
  payload: DraftRecord["payload"],
): ErrResult | null {
  if (stepId === "basics") {
    const r = stepBasicsSchema.safeParse(payload);
    if (!r.success) {
      return err(
        "step_invalid",
        "基本情報ステップの入力が不足しています",
        zodToFieldErrors(r.error.issues),
      );
    }
    return null;
  }
  if (stepId === "lines") {
    const r = stepLinesSchema.safeParse({ lines: payload.lines ?? [] });
    if (!r.success) {
      return err(
        "step_invalid",
        "明細ステップの入力が不足しています",
        zodToFieldErrors(r.error.issues),
      );
    }
    return null;
  }
  // review: no field gate to leave review
  return null;
}

export function goNext(
  actor: Actor,
  id: string,
  stepIdRaw: unknown,
  rawPatch?: unknown,
): Result<{ draft: DraftView; step: StepId }> {
  const gate = assertOpenWritable(actor, getDraftRecord(id));
  if (!gate.ok) return gate;

  const stepParsed = stepIdSchema.safeParse(stepIdRaw);
  if (!stepParsed.success) {
    return err("step_invalid", "不明な step です");
  }
  const stepId = stepParsed.data;

  let record = gate.record;
  if (rawPatch !== undefined) {
    const parsed = draftPatchSchema.safeParse(rawPatch);
    if (!parsed.success) {
      return err(
        "validation_failed",
        "保存データが不正です",
        zodToFieldErrors(parsed.error.issues),
      );
    }
    record = {
      ...record,
      payload: mergePayload(record.payload, parsed.data as DraftPatch),
      updatedAt: now(),
    };
  }

  const stepErr = assertStepPayload(stepId, record.payload);
  if (stepErr) return stepErr;

  const nxt = nextStep(stepId);
  if (!nxt) {
    return err("step_invalid", "これ以上先の step はありません");
  }

  const nextRecord: DraftRecord = {
    ...record,
    lastStepId: nxt,
    updatedAt: now(),
  };
  putDraft(nextRecord);
  return { ok: true, draft: toDraftView(nextRecord), step: nxt };
}

export function submit(
  actor: Actor,
  id: string,
): Result<{ submitted: SubmittedView }> {
  const gate = assertOpenWritable(actor, getDraftRecord(id));
  if (!gate.ok) {
    if (!gate.ok && gate.code === "already_submitted") {
      const existing = getDraftRecord(id);
      if (existing?.submittedId) {
        const pr = getPurchaseRequestRecord(existing.submittedId);
        if (pr) {
          return err("already_submitted", "すでに提出済みです");
        }
      }
    }
    return gate;
  }

  const record = gate.record;
  const parsed = submitSchema.safeParse({
    title: record.payload.title,
    vendorName: record.payload.vendorName,
    neededBy: record.payload.neededBy,
    note: record.payload.note,
    lines: record.payload.lines,
  });
  if (!parsed.success) {
    return err(
      "submit_invalid",
      "提出に必要な項目が揃っていません",
      zodToFieldErrors(parsed.error.issues),
    );
  }

  const prId = newPrId();
  const submittedAt = now();
  putPurchaseRequest({
    id: prId,
    draftId: record.id,
    ownerId: record.ownerId,
    payload: parsed.data,
    submittedAt,
  });
  putDraft({
    ...record,
    status: "submitted",
    submittedId: prId,
    updatedAt: submittedAt,
  });

  const pr = getPurchaseRequestRecord(prId)!;
  return { ok: true, submitted: toSubmittedView(pr) };
}

export function getPurchaseRequest(
  actor: Actor,
  id: string,
): Result<{ submitted: SubmittedView }> {
  const pr = getPurchaseRequestRecord(id);
  if (!pr) return err("not_found", "発注リクエストが見つかりません");
  if (!canReadDraft(actor, pr.ownerId)) {
    return err("forbidden", "閲覧権限がありません");
  }
  return { ok: true, submitted: toSubmittedView(pr) };
}
