import { resetShipments } from "@/entities/shipment";
import { resetExportJobs } from "@/features/export-jobs/server/job-store";

/** E2E / デモ用: 全 in-memory 状態を初期化 */
export function resetAllStores(): void {
  resetShipments();
  resetExportJobs();
}
