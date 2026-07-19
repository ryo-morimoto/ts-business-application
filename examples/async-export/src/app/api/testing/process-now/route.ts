import { processJobNow } from "@/features/export-jobs";
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
  const job = processJobNow(parsed.data.jobId);
  if (!job) {
    return json({ error: "not_found", message: "依頼が見つかりません。" }, 404);
  }
  return json(job);
}
