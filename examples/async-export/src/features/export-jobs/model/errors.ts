import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "invalid_body",
  "invalid_query",
  "not_found",
  "forbidden",
  "export_not_allowed",
  "artifact_not_ready",
  "artifact_expired",
  "artifact_unavailable",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: apiErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
