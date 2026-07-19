import type { ExportJobStatus } from "./export-job";

/** 画面表示用の業務語 */
export function jobStatusLabel(status: ExportJobStatus): string {
  switch (status) {
    case "accepted":
      return "受付済み";
    case "running":
      return "処理中";
    case "completed":
      return "完了";
    case "failed":
      return "失敗";
  }
}

export function isTerminal(status: ExportJobStatus): boolean {
  return status === "completed" || status === "failed";
}

/** 成果物を渡してよいのは completed のみ */
export function canDeliverArtifact(status: ExportJobStatus): boolean {
  return status === "completed";
}
