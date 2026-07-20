import { StatusCluster } from "~/design-system";
import type { Account } from "../model/types";

const statusLabel: Record<Account["status"], string> = {
  prospect: "見込",
  active: "稼働",
  suspended: "停止",
};

const statusTone: Record<
  Account["status"],
  "neutral" | "success" | "warning" | "danger"
> = {
  prospect: "neutral",
  active: "success",
  suspended: "danger",
};

/** Max 2 chips: status + optional hold/suspend. */
export function TradingStateCluster({ account }: { account: Account }) {
  const items: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }[] =
    [{ label: statusLabel[account.status], tone: statusTone[account.status] }];

  if (account.creditHold) {
    items.push({ label: "与信停止", tone: "warning" });
  } else if (account.tradeSuspended) {
    items.push({ label: "出荷停止", tone: "warning" });
  }

  return <StatusCluster items={items.slice(0, 2)} />;
}

export function formatYen(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}
