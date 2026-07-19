import { EXPORT_ROW_LIMIT } from "./limits";
import type { ExportFailureReason } from "./export-job";

/**
 * 失敗理由を業務語へ。内部コードだけを見せて終わらせない。
 */
export function failureMessage(
  reason: ExportFailureReason,
  detail?: { matchedCount?: number; limit?: number },
): string {
  const limit = detail?.limit ?? EXPORT_ROW_LIMIT;
  const matched = detail?.matchedCount;

  switch (reason) {
    case "empty_result":
      return "条件に一致する出荷明細が0件のため、成果物は作成されませんでした。条件を見直して再依頼してください。";
    case "row_limit_exceeded":
      return `対象件数が上限（${limit}件）を超えています${
        matched !== undefined ? `（一致 ${matched} 件）` : ""
      }。条件を絞って分割して依頼してください。途中までのファイルは渡しません。`;
    case "unauthorized_scope":
      return "処理の過程で、出力範囲に閲覧権限のないデータが含まれていることが判明しました。成果物は作成されません。権限を確認するか、条件を絞って再依頼してください。";
    case "processing_timeout":
      return "処理時間が上限を超えたため中断しました。件数を減らして再依頼してください。";
    case "system_interrupted":
      return "システム都合で処理が中断されました。同じ条件で再依頼できます。";
  }
}
