import { queryOptions } from "@tanstack/react-query";
import { getOrderFn, listOrdersFn } from "./orders.functions";

export const orderQueries = {
  all: () => ["orders"] as const,
  lists: () => [...orderQueries.all(), "list"] as const,
  list: () =>
    queryOptions({
      queryKey: [...orderQueries.lists()] as const,
      queryFn: () => listOrdersFn(),
    }),
  details: () => [...orderQueries.all(), "detail"] as const,
  detail: (id: string) =>
    queryOptions({
      queryKey: [...orderQueries.details(), id] as const,
      queryFn: () => getOrderFn({ data: { id } }),
    }),
};
