import type { ListQuery } from "./types";

/** URL search (all strings) ↔ ListQuery */
export type AccountsSearch = {
  q: string;
  status: string;
  ownerId: string;
  segment: string;
  incomplete: string;
  creditHold: string;
  sort: string;
  page: string;
};

export const defaultAccountsSearch: AccountsSearch = {
  q: "",
  status: "",
  ownerId: "",
  segment: "",
  incomplete: "",
  creditHold: "",
  sort: "updatedAt",
  page: "1",
};

export function parseAccountsSearch(
  s: Partial<AccountsSearch> | undefined,
): ListQuery {
  const page = Number(s?.page || "1");
  return {
    q: s?.q || undefined,
    status: (s?.status || undefined) as ListQuery["status"],
    ownerId: s?.ownerId || undefined,
    segment: (s?.segment || undefined) as ListQuery["segment"],
    incomplete: s?.incomplete === "1" || s?.incomplete === "true",
    creditHold: s?.creditHold === "1" || s?.creditHold === "true",
    sort: (s?.sort as ListQuery["sort"]) || "updatedAt",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function accountsSearchFromUnknown(
  raw: Record<string, unknown>,
): AccountsSearch {
  const str = (k: string) =>
    typeof raw[k] === "string" ? (raw[k] as string) : "";
  return {
    q: str("q"),
    status: str("status"),
    ownerId: str("ownerId"),
    segment: str("segment"),
    incomplete: str("incomplete"),
    creditHold: str("creditHold"),
    sort: str("sort") || "updatedAt",
    page: str("page") || "1",
  };
}
