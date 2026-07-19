import type { ForeignAvailability } from "@fulfillment-desk/domain";
import { runForeignCall } from "./call";
import { omsListInventory } from "./oms-mock";
import type { ExternalCallOptions, ExternalResult } from "./types";

/**
 * Inventory is also external SoR.
 * Reads live from the OMS mock inventory table so ship mutations stay consistent.
 */
export async function inventoryGetAvailability(
  sku: string,
  warehouseId: string,
  opts?: ExternalCallOptions,
): Promise<ExternalResult<ForeignAvailability>> {
  return runForeignCall(opts, () => {
    const rows = omsListInventory();
    const row = rows.find(
      (i) => i.sku === sku && i.warehouse_id === warehouseId,
    );
    if (!row) {
      return {
        ok: true,
        data: {
          sku,
          warehouse_id: warehouseId,
          available_qty: 0,
        },
      };
    }
    return { ok: true, data: row };
  });
}

export async function inventoryGetMany(
  pairs: Array<{ sku: string; warehouse_id: string }>,
  opts?: ExternalCallOptions,
): Promise<ExternalResult<ForeignAvailability[]>> {
  // One foreign "batch" surface — still records as inventory.get_many in BFF.
  // Internally sequential to keep the mock simple; real SoRs may batch differently.
  const out: ForeignAvailability[] = [];
  for (const p of pairs) {
    const r = await inventoryGetAvailability(p.sku, p.warehouse_id, opts);
    if (!r.ok) return r;
    out.push(r.data);
  }
  return { ok: true, data: out };
}
