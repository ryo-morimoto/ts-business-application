import type { Account, AccountReadiness, ReadinessIssue } from "./types";

export function computeReadiness(account: Account): AccountReadiness {
  const issues: ReadinessIssue[] = [];

  const hasBillTo = account.addresses.some((a) => a.role === "bill_to");
  const hasShipTo = account.addresses.some((a) => a.role === "ship_to");
  const primaryCount = account.contacts.filter((c) => c.isPrimary).length;

  if (!account.taxId?.trim()) {
    issues.push({
      code: "missing_tax_id",
      message: "法人番号（税号）が未登録です",
      section: "commercial",
    });
  }

  if (!hasBillTo) {
    issues.push({
      code: "missing_bill_to",
      message: "請求先住所（bill_to）がありません",
      section: "addresses",
    });
  }

  if (!hasShipTo && account.status === "active") {
    issues.push({
      code: "missing_ship_to",
      message: "納品先住所（ship_to）がありません",
      section: "addresses",
    });
  }

  if (account.contacts.length === 0) {
    issues.push({
      code: "no_contact",
      message: "担当者が登録されていません",
      section: "contacts",
    });
  } else if (primaryCount === 0) {
    issues.push({
      code: "no_primary_contact",
      message: "代表担当（primary）が指定されていません",
      section: "contacts",
    });
  }

  if (!account.invoiceEmail?.trim() && account.status === "active") {
    issues.push({
      code: "missing_invoice_email",
      message: "請求送付先メールが未設定です",
      section: "commercial",
    });
  }

  if (account.creditHold && !account.creditHoldReason?.trim()) {
    issues.push({
      code: "credit_hold_without_reason",
      message: "与信停止中ですが理由が空です",
      section: "commercial",
    });
  }

  if (account.status === "active" && !hasBillTo) {
    issues.push({
      code: "active_without_bill_to",
      message: "稼働中ですが請求先がありません",
      section: "addresses",
    });
  }

  if (account.status === "suspended" && !account.statusReason?.trim()) {
    issues.push({
      code: "suspended_without_reason",
      message: "停止中ですが停止理由が空です",
      section: "commercial",
    });
  }

  // Dedupe by code (active_without_bill_to may overlap missing_bill_to)
  const seen = new Set<string>();
  const unique = issues.filter((i) => {
    if (seen.has(i.code)) return false;
    seen.add(i.code);
    return true;
  });

  return { ready: unique.length === 0, issues: unique };
}

export function availableCredit(
  creditLimit: number,
  accruedReceivables: number,
): number {
  return creditLimit - accruedReceivables;
}
