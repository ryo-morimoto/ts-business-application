import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  acceptTicket,
  cloneRuleSet,
  createTicket,
  discardRuleSetDraft,
  getRuleSetView,
  getTicketView,
  listReports,
  listRuleSets,
  listTickets,
  patchTicket,
  publishRuleSet,
  repinRuleSet,
  reportSuspicious,
  resetSateiStore,
  updateRuleSetDraft,
} from "./satei.server";
import { CATEGORIES } from "../model/types";
import {
  ACTOR_COOKIE,
  ACTOR_HEADER,
  ACTORS,
  parseActorId,
  type Actor,
} from "~/shared/actor/actor";

function readCookie(name: string): string | undefined {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function resolveActor(): Actor {
  const fromHeader = getRequestHeader(ACTOR_HEADER);
  const fromCookie = readCookie(ACTOR_COOKIE);
  const id = parseActorId(fromHeader ?? fromCookie);
  return ACTORS[id];
}

const categorySchema = z.enum(CATEGORIES);

const lineSchema = z.object({
  id: z.string().optional(),
  category: categorySchema,
  offerAmount: z.number(),
  attrs: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  channel: z.enum(["store", "mail_in"]).optional(),
  paymentMethod: z.enum(["cash", "transfer"]).optional(),
  seller: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      occupation: z.string().optional(),
      age: z.string().optional(),
    })
    .optional(),
  idCheck: z
    .object({
      status: z.enum(["pending", "complete"]).optional(),
      method: z.string().optional(),
      docType: z.string().optional(),
      remoteIdMethod: z.string().optional(),
    })
    .optional(),
  aml: z.object({ purpose: z.string().optional() }).optional(),
  authenticity: z.enum(["pass", "hold", "reject"]).optional(),
  lines: z.array(lineSchema).optional(),
});

const editableSchema = z.object({
  identityThresholdYen: z.number(),
  alwaysIdCategories: z.array(categorySchema),
  forceIdentityAll: z.boolean(),
  amlCashThresholdYen: z.number(),
});

export const listTicketsFn = createServerFn({ method: "GET" }).handler(
  async () => listTickets(resolveActor()),
);

export const getTicketFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const result = getTicketView(resolveActor(), data.id);
    if (!result.ok) {
      throw new Error(`${result.code}: ${result.message}`);
    }
    return result.value;
  });

export const createTicketFn = createServerFn({ method: "POST" })
  .validator(z.object({ channel: z.enum(["store", "mail_in"]) }))
  .handler(async ({ data }) => {
    return createTicket(resolveActor(), data);
  });

export const patchTicketFn = createServerFn({ method: "POST" })
  .validator(patchSchema)
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    return patchTicket(resolveActor(), id, patch);
  });

export const acceptTicketFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => acceptTicket(resolveActor(), data.id));

export const repinRuleSetFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => repinRuleSet(resolveActor(), data.id));

export const reportSuspiciousFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ticketId: z.string().min(1),
      reasonCode: z.enum(["suspected_stolen", "serial_tamper", "other"]),
      note: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => reportSuspicious(resolveActor(), data));

export const listRuleSetsFn = createServerFn({ method: "GET" }).handler(
  async () => listRuleSets(resolveActor()),
);

export const getRuleSetFn = createServerFn({ method: "GET" })
  .validator(z.object({ version: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const result = getRuleSetView(resolveActor(), data.version);
    if (!result.ok) {
      throw new Error(`${result.code}: ${result.message}`);
    }
    return result.value;
  });

export const cloneRuleSetFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sourceVersion: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }) =>
    cloneRuleSet(resolveActor(), data.sourceVersion),
  );

export const updateRuleSetDraftFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      version: z.number().int().positive(),
      editable: editableSchema,
      label: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data }) =>
    updateRuleSetDraft(resolveActor(), data.version, {
      editable: data.editable,
      label: data.label,
    }),
  );

export const discardRuleSetDraftFn = createServerFn({ method: "POST" })
  .validator(z.object({ version: z.number().int().positive() }))
  .handler(async ({ data }) =>
    discardRuleSetDraft(resolveActor(), data.version),
  );

export const publishRuleSetFn = createServerFn({ method: "POST" })
  .validator(z.object({ version: z.number().int().positive() }))
  .handler(async ({ data }) => publishRuleSet(resolveActor(), data.version));

export const listReportsFn = createServerFn({ method: "GET" }).handler(
  async () => listReports(resolveActor()),
);

export const resetStoreFn = createServerFn({ method: "POST" }).handler(
  async () => {
    resetSateiStore();
    return { ok: true as const };
  },
);
