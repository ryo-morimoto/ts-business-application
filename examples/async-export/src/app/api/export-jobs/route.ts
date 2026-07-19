import {
  createExportJobBodySchema,
  createExportJobForActor,
  getJobsForActor,
} from "@/features/export-jobs";
import { actorFromRequest, json } from "@/shared/actor/http";
import type { NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const actor = actorFromRequest(req);
  return json({ items: getJobsForActor(actor) });
}

/** Route Handler 版の依頼受付（Server Action と同契約。E2E/API 向け） */
export async function POST(req: NextRequest) {
  const actor = actorFromRequest(req);
  const body = await req.json().catch(() => null);
  const parsed = createExportJobBodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "invalid_body",
        message: "依頼内容の形式が正しくありません。",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const result = createExportJobForActor(actor, parsed.data);
  if (!result.ok) {
    const status = result.error === "export_not_allowed" ? 403 : 400;
    return json(
      { error: result.error, message: result.message, details: result.details },
      status,
    );
  }

  return json(result.job, 202);
}
