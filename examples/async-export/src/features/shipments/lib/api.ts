import type { Shipment, ShipmentCriteria } from "@/entities/shipment";
import { ACTOR_COOKIE } from "@/shared/actor";

function actorHeaders(): HeadersInit {
  if (typeof document === "undefined") return {};
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ACTOR_COOKIE}=`));
  const id = match?.slice(ACTOR_COOKIE.length + 1) || "clerk";
  return { "x-actor-id": decodeURIComponent(id) };
}

export type ShipmentsResponse = {
  items: Shipment[];
  total: number;
  totalIsExact: true;
  pageSize: number;
  criteria: ShipmentCriteria;
  actor: {
    id: string;
    role: string;
    warehouseIds: string[];
  };
};

export async function fetchShipments(
  criteria: ShipmentCriteria,
): Promise<ShipmentsResponse> {
  const sp = new URLSearchParams();
  if (criteria.warehouseId) sp.set("warehouseId", criteria.warehouseId);
  if (criteria.status) sp.set("status", criteria.status);
  if (criteria.assigneeId) sp.set("assigneeId", criteria.assigneeId);
  if (criteria.plannedShipDateFrom) {
    sp.set("plannedShipDateFrom", criteria.plannedShipDateFrom);
  }
  if (criteria.plannedShipDateTo) {
    sp.set("plannedShipDateTo", criteria.plannedShipDateTo);
  }
  const res = await fetch(`/api/shipments?${sp.toString()}`, {
    headers: actorHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `一覧の取得に失敗しました (${res.status})`);
  }
  return res.json();
}
