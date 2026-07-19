import { ACTOR_COOKIE } from "@/shared/actor";
import type { ExportJob } from "../model/export-job";

function actorHeaders(): HeadersInit {
  if (typeof document === "undefined") return {};
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ACTOR_COOKIE}=`));
  const id = match?.slice(ACTOR_COOKIE.length + 1) || "clerk";
  return { "x-actor-id": decodeURIComponent(id) };
}

export async function fetchExportJobs(): Promise<ExportJob[]> {
  const res = await fetch("/api/export-jobs", {
    headers: actorHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("依頼一覧の取得に失敗しました");
  }
  const body = (await res.json()) as { items: ExportJob[] };
  return body.items;
}

export function downloadUrl(jobId: string): string {
  return `/api/export-jobs/${jobId}/download`;
}
