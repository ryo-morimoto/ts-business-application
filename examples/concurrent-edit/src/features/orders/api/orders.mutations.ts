import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrderFn } from "./orders.functions";
import { orderQueries } from "./orders.queries";
import type { UpdateOrderInput, UpdateOrderResult } from "../model/schemas";

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["orders", "update"],
    mutationFn: (input: UpdateOrderInput) =>
      updateOrderFn({ data: input }) as Promise<UpdateOrderResult>,
    onSuccess: async (result) => {
      if (!result.ok) {
        // Conflict / forbidden: keep client form state; seed cache with server truth when present.
        if (result.code === "version_conflict") {
          queryClient.setQueryData(
            orderQueries.detail(result.current.id).queryKey,
            result.current,
          );
        }
        return;
      }

      queryClient.setQueryData(
        orderQueries.detail(result.order.id).queryKey,
        result.order,
      );
      await queryClient.invalidateQueries({ queryKey: orderQueries.lists() });
    },
  });
}
