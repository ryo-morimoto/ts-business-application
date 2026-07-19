import { z } from "zod";

export const orderLineSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1, "SKU is required"),
  description: z.string(),
  quantity: z.number().int().positive("Quantity must be ≥ 1"),
  unitPrice: z.number().nonnegative("Unit price must be ≥ 0"),
});

export const orderSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().min(1, "Customer is required"),
  note: z.string(),
  version: z.number().int().positive(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  lines: z.array(orderLineSchema).min(1, "At least one line is required"),
});

export const orderListItemSchema = orderSchema.pick({
  id: true,
  customerName: true,
  version: true,
  updatedAt: true,
  updatedBy: true,
}).extend({
  lineCount: z.number().int().nonnegative(),
  total: z.number().nonnegative(),
});

export const updateOrderInputSchema = z.object({
  id: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  customerName: z.string().min(1, "Customer is required"),
  note: z.string(),
  lines: z.array(orderLineSchema).min(1, "At least one line is required"),
});

export const updateOrderResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    order: orderSchema,
  }),
  z.object({
    ok: z.literal(false),
    code: z.literal("version_conflict"),
    yourExpected: z.number().int().positive(),
    current: orderSchema,
  }),
  z.object({
    ok: z.literal(false),
    code: z.literal("not_found"),
  }),
  z.object({
    ok: z.literal(false),
    code: z.literal("forbidden"),
  }),
]);

export type OrderLine = z.infer<typeof orderLineSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderListItem = z.infer<typeof orderListItemSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;
export type UpdateOrderResult = z.infer<typeof updateOrderResultSchema>;

/** Form values exclude concurrency metadata managed outside the form body. */
export const orderFormValuesSchema = z.object({
  customerName: z.string().min(1, "Customer is required"),
  note: z.string(),
  lines: z.array(orderLineSchema).min(1, "At least one line is required"),
});

export type OrderFormValues = z.infer<typeof orderFormValuesSchema>;
