import { z } from "zod";

export const customerIdSchema = z.string().min(1);

export const customerSchema = z.object({
  id: customerIdSchema,
  name: z.string().min(1),
  assigneeId: z.string().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;

export const customerFilterSchema = z.object({
  query: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
});

export type CustomerFilter = z.infer<typeof customerFilterSchema>;

export const customerListQuerySchema = customerFilterSchema.extend({
  sort: z.enum(["name", "assigneeId"]).default("name"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export const customerListResponseSchema = z.object({
  items: z.array(customerSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;
