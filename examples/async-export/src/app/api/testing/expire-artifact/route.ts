import { expireArtifact } from "@/features/export-jobs";
import { getJob } from "@/features/export-jobs/server/job-store";
import { json } from "@/shared/actor/http";
import { z } from "zod";
import type { NextRequest } from "next/server";

const bodySchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "invalid_body", message: "jobId が必要です。" },
      400,
    );
  }
  const ok = expireArtifact(parsed.data.jobId);
  if (!ok) {
    return json(
      { error: "not_found", message: "完了済み成果物がありません。" },
      404,
    );
  }
  const job = getJob(parsed.data.jobId)!;
  const { csvBody: _, ...pub } = job;
  return json(pub);
}
