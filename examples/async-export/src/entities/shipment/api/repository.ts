import type { Actor } from "@/shared/actor";
import {
  filterShipments,
  sortShipments,
  type ShipmentCriteria,
} from "../model/filter-shipments";
import type { Shipment } from "../model/shipment";
import { buildSeedShipments } from "./seed";

type ShipmentsState = {
  shipments: Shipment[];
};

const globalForShipments = globalThis as unknown as {
  __asyncExportShipments?: ShipmentsState;
};

function state(): ShipmentsState {
  if (!globalForShipments.__asyncExportShipments) {
    globalForShipments.__asyncExportShipments = {
      shipments: buildSeedShipments(),
    };
  }
  return globalForShipments.__asyncExportShipments;
}

export function resetShipments(): void {
  state().shipments = buildSeedShipments();
}

export function getShipments(): readonly Shipment[] {
  return state().shipments;
}

export function listVisibleShipments(
  actor: Actor,
  criteria: ShipmentCriteria,
): Shipment[] {
  return sortShipments(filterShipments(state().shipments, criteria, actor));
}

export function listShipmentsForActor(
  actor: Actor,
  criteria: ShipmentCriteria,
): { items: Shipment[]; total: number } {
  const items = listVisibleShipments(actor, criteria);
  return { items, total: items.length };
}
