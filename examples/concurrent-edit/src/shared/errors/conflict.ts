import type { Order } from "~/features/orders/model/schemas";

export type VersionConflict = {
  code: "version_conflict";
  yourExpected: number;
  current: Order;
};

export function isVersionConflict(value: unknown): value is VersionConflict {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.code === "version_conflict" &&
    typeof v.yourExpected === "number" &&
    v.current !== null &&
    typeof v.current === "object"
  );
}
