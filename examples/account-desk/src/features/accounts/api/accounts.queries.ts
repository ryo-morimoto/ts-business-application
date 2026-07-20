import { queryOptions } from "@tanstack/react-query";
import { getAccountFn, listAccountsFn, listParentsFn } from "./accounts.functions";
import type { ListQuery } from "../model/types";

export function accountsListQuery(query: ListQuery) {
  return queryOptions({
    queryKey: ["accounts", "list", query] as const,
    queryFn: () => listAccountsFn({ data: query }),
  });
}

export function accountDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["accounts", "detail", id] as const,
    queryFn: () => getAccountFn({ data: { id } }),
  });
}

export function parentsQuery() {
  return queryOptions({
    queryKey: ["accounts", "parents"] as const,
    queryFn: () => listParentsFn(),
  });
}
