"use server";

import { actorFromCookies } from "@/shared/actor/http";
import type { ExportCriteria } from "../model/export-criteria";
import type { ExportJob } from "../model/export-job";
import { createExportJobForActor } from "../server/export-service";

export type CreateExportActionResult =
  | { ok: true; job: ExportJob }
  | { ok: false; message: string; error: string };

/**
 * ファイル出力依頼の受付（Server Action）。
 * 戻り値は「受け付けた依頼」であり、成果物そのものではない。
 */
export async function createExportJobAction(
  criteria: ExportCriteria,
): Promise<CreateExportActionResult> {
  const actor = await actorFromCookies();
  const result = createExportJobForActor(actor, { criteria });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      message: result.message,
    };
  }

  return { ok: true, job: result.job };
}
