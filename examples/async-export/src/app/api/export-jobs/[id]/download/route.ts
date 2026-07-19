import { downloadArtifactForActor } from "@/features/export-jobs";
import { actorFromRequest, json } from "@/shared/actor/http";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 成果物の受け取り。completed かつ未期限切れのみ。
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const actor = actorFromRequest(req);
  const result = downloadArtifactForActor(actor, id);

  if (!result.ok) {
    return json(
      { error: result.error, message: result.message },
      result.status,
    );
  }

  return new Response(result.body, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
