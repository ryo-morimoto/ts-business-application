import { z } from "zod";

export const stepIdSchema = z.enum(["basics", "lines", "review"]);
export type StepId = z.infer<typeof stepIdSchema>;

/** empty string → undefined; otherwise YYYY-MM-DD or reject */
const dateString = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式").optional());

const lineDraftSchema = z.object({
  sku: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
});

/** PATCH: missing OK, format-invalid rejected */
export const draftPatchSchema = z
  .object({
    title: z.string().optional(),
    vendorName: z.string().optional(),
    neededBy: dateString,
    note: z.string().optional(),
    lines: z.array(lineDraftSchema).optional(),
  })
  .strict();

export type DraftPatch = z.infer<typeof draftPatchSchema>;

export const stepBasicsSchema = z.object({
  title: z.string().min(1, "件名は必須"),
  vendorName: z.string().min(1, "仕入先は必須"),
  neededBy: dateString,
  note: z.string().optional(),
});

const lineStepSchema = z.object({
  sku: z.string().min(1, "SKU は必須"),
  quantity: z.number().positive("数量は 1 以上"),
  unitPrice: z.number().nonnegative().optional(),
});

export const stepLinesSchema = z.object({
  lines: z.array(lineStepSchema).min(1, "明細は 1 行以上"),
});

export const submitLineSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
});

/** Full domain form on submit */
export const submitSchema = z.object({
  title: z.string().min(1),
  vendorName: z.string().min(1),
  neededBy: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  note: z.string().optional(),
  lines: z.array(submitLineSchema).min(1),
});

export type SubmitPayload = z.infer<typeof submitSchema>;

export type DraftPayload = {
  title?: string;
  vendorName?: string;
  neededBy?: string;
  note?: string;
  lines?: Array<{
    sku?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
};
