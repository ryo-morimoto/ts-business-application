import { z } from "zod";

export const requestStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const requestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
  status: requestStatusSchema,
  authorId: z.string().min(1),
  rejectReason: z.string().nullable(),
  updatedAt: z.string().min(1),
});

export type ApprovalRequest = z.infer<typeof requestSchema>;

export const createRequestBodySchema = z.object({
  title: z.string().min(1),
  body: z.string().default(""),
});

export type CreateRequestBody = z.infer<typeof createRequestBodySchema>;
