import { z } from "zod";
import {
  ACCOUNT_STATUSES,
  ADDRESS_ROLES,
  CONTACT_ROLES,
  CURRENCIES,
  SEGMENTS,
} from "./types";

const addressSchema = z.object({
  id: z.string().optional(),
  role: z.enum(ADDRESS_ROLES),
  isDefaultForRole: z.boolean(),
  label: z.string().optional(),
  postalCode: z.string().optional(),
  prefecture: z.string().optional(),
  line1: z.string().min(1, "住所1行目は必須です"),
  line2: z.string().optional(),
  countryCode: z.string().min(2).max(2),
});

const contactSchema = z.object({
  id: z.string().optional(),
  role: z.enum(CONTACT_ROLES),
  name: z.string().min(1, "担当者名は必須です"),
  nameKana: z.string().optional(),
  email: z
    .string()
    .email("メール形式が不正です")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean(),
});

export const accountWriteSchema = z
  .object({
    code: z
      .string()
      .min(1, "取引先コードは必須です")
      .regex(/^[A-Z0-9-]+$/, "コードは英大文字・数字・ハイフンのみ"),
    legalName: z.string().min(1, "正式名称は必須です"),
    nameKana: z.string().optional(),
    tradeName: z.string().optional(),
    status: z.enum(ACCOUNT_STATUSES),
    statusReason: z.string().optional(),
    creditHold: z.boolean(),
    creditHoldReason: z.string().optional(),
    tradeSuspended: z.boolean(),
    tradeSuspendReason: z.string().optional(),
    ownerId: z.string().min(1, "社内担当は必須です"),
    parentAccountId: z.string().optional().or(z.literal("")),
    segment: z.enum(SEGMENTS),
    tags: z.array(z.string().min(1)).max(8),
    industry: z.string().optional(),
    countryCode: z.string().min(2).max(2),
    timezone: z.string().optional(),
    taxId: z.string().optional(),
    currency: z.enum(CURRENCIES),
    creditLimit: z.number().min(0, "与信限度は0以上"),
    paymentTermsDays: z.number().int().positive("支払サイトは正の整数"),
    invoiceEmail: z
      .string()
      .email("請求メールの形式が不正です")
      .optional()
      .or(z.literal("")),
    alertNote: z.string().max(200).optional(),
    internalMemo: z.string().max(4000).optional(),
    addresses: z.array(addressSchema).min(1, "住所を1件以上入力してください"),
    contacts: z.array(contactSchema),
  })
  .superRefine((val, ctx) => {
    if (val.creditHold && !val.creditHoldReason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["creditHoldReason"],
        message: "与信停止時は理由が必須です",
      });
    }
    if (val.status === "suspended" && !val.statusReason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["statusReason"],
        message: "停止時は停止理由が必須です",
      });
    }
    if (val.status === "active") {
      if (!val.addresses.some((a) => a.role === "bill_to")) {
        ctx.addIssue({
          code: "custom",
          path: ["addresses"],
          message: "稼働中は請求先（bill_to）が必須です",
        });
      }
      if (val.contacts.length > 0) {
        const primaries = val.contacts.filter((c) => c.isPrimary);
        if (primaries.length === 0) {
          ctx.addIssue({
            code: "custom",
            path: ["contacts"],
            message: "担当がいる場合は代表を1人指定してください",
          });
        }
        if (primaries.length > 1) {
          ctx.addIssue({
            code: "custom",
            path: ["contacts"],
            message: "代表担当は1人だけにしてください",
          });
        }
      } else {
        ctx.addIssue({
          code: "custom",
          path: ["contacts"],
          message: "稼働中は担当者を1人以上登録してください",
        });
      }
    } else if (val.contacts.filter((c) => c.isPrimary).length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["contacts"],
        message: "代表担当は1人だけにしてください",
      });
    }

    // default uniqueness per role
    for (const role of ["hq", "bill_to", "ship_to"] as const) {
      const defaults = val.addresses.filter(
        (a) => a.role === role && a.isDefaultForRole,
      );
      if (defaults.length > 1) {
        ctx.addIssue({
          code: "custom",
          path: ["addresses"],
          message: `${role} の default は1件までです`,
        });
      }
    }
  });

export type AccountWriteInput = z.infer<typeof accountWriteSchema>;

export const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(ACCOUNT_STATUSES).or(z.literal("")).optional(),
  ownerId: z.string().optional(),
  segment: z.enum(SEGMENTS).or(z.literal("")).optional(),
  incomplete: z.boolean().optional(),
  creditHold: z.boolean().optional(),
  sort: z.enum(["name", "updatedAt", "code"]).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});
