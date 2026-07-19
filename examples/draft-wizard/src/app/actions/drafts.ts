"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  create,
  goNext,
  save,
  submit,
  type DraftPatch,
  type StepId,
} from "@/modules/drafting";
import { actorFromCookies } from "@/shared/actor/resolve";
import type { ErrResult } from "@/shared/http/result";

export type ActionOk<T> = { ok: true } & T;
export type ActionResult<T> = ActionOk<T> | ErrResult;

export async function createDraftAction(): Promise<void> {
  const actor = await actorFromCookies();
  const result = create(actor);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/");
  redirect(`/drafts/${result.draft.id}?step=basics`);
}

export async function saveDraftAction(
  id: string,
  patch: DraftPatch,
): Promise<ActionResult<{ draft: import("@/modules/drafting").DraftView }>> {
  const actor = await actorFromCookies();
  const result = save(actor, id, patch);
  if (!result.ok) return result;
  revalidatePath(`/drafts/${id}`);
  revalidatePath("/");
  return { ok: true, draft: result.draft };
}

export async function goNextAction(
  id: string,
  stepId: StepId,
  patch?: DraftPatch,
): Promise<
  ActionResult<{ draft: import("@/modules/drafting").DraftView; step: StepId }>
> {
  const actor = await actorFromCookies();
  const result = goNext(actor, id, stepId, patch);
  if (!result.ok) return result;
  revalidatePath(`/drafts/${id}`);
  return { ok: true, draft: result.draft, step: result.step };
}

export async function submitDraftAction(
  id: string,
): Promise<ActionResult<{ submittedId: string }> | void> {
  const actor = await actorFromCookies();
  const result = submit(actor, id);
  if (!result.ok) return result;
  revalidatePath("/");
  revalidatePath(`/drafts/${id}`);
  redirect(`/purchase-requests/${result.submitted.id}`);
}
