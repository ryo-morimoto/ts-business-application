/**
 * 実装時の仮置き上限（業務要件: 件数・保管には上限がある）。
 * プロダクト値ではない — example で失敗経路を辿りやすくする。
 */
export const EXPORT_ROW_LIMIT = 25;

/** 成果物の保持日数（仮置き） */
export const ARTIFACT_RETENTION_DAYS = 7;

/** 処理時間上限（ミリ秒）。example では人工遅延でシミュレート */
export const PROCESSING_TIMEOUT_MS = 8_000;
