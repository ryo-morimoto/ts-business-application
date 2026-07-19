import type { WarehouseId } from "@/shared/catalog/warehouse";

export type ActorRole = "clerk" | "manager" | "admin" | "outsider";

export type Actor = {
  id: string;
  role: ActorRole;
  displayName: string;
  /**
   * 閲覧・出力可能な倉庫。空配列 = どの倉庫も見えない。
   * admin は全倉庫。
   */
  warehouseIds: readonly WarehouseId[];
  /** 組織内の他者の依頼を見られるか */
  canViewOrgJobs: boolean;
};

const ACTORS: Record<string, Actor> = {
  clerk: {
    id: "clerk",
    role: "clerk",
    displayName: "一般担当（倉庫 A/B）",
    warehouseIds: ["WH-A", "WH-B"],
    canViewOrgJobs: false,
  },
  manager: {
    id: "manager",
    role: "manager",
    displayName: "上長（倉庫 A/B/C・組織内依頼可）",
    warehouseIds: ["WH-A", "WH-B", "WH-C"],
    canViewOrgJobs: true,
  },
  admin: {
    id: "admin",
    role: "admin",
    displayName: "管理者（全倉庫・全依頼）",
    warehouseIds: ["WH-A", "WH-B", "WH-C", "WH-X"],
    canViewOrgJobs: true,
  },
  outsider: {
    id: "outsider",
    role: "outsider",
    displayName: "権限なし",
    warehouseIds: [],
    canViewOrgJobs: false,
  },
};

export function listActors(): Actor[] {
  return Object.values(ACTORS);
}

export function resolveActor(actorId: string | null | undefined): Actor {
  const id = actorId?.trim() || "clerk";
  return ACTORS[id] ?? ACTORS.outsider!;
}

/**
 * デモ用: 実行時に倉庫権限を差し替える。
 * 処理中に権限が足りなくなる副シナリオ向け。
 */
export function withWarehouseScope(
  actor: Actor,
  warehouseIds: readonly WarehouseId[],
): Actor {
  return {
    ...actor,
    warehouseIds: [...warehouseIds],
  };
}

export function canAccessWarehouse(
  actor: Actor,
  warehouseId: WarehouseId,
): boolean {
  return actor.warehouseIds.includes(warehouseId);
}

export function canViewJob(actor: Actor, jobRequestedBy: string): boolean {
  if (actor.canViewOrgJobs) return true;
  return actor.id === jobRequestedBy;
}
