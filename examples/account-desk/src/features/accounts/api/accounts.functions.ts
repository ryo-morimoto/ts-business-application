import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  createAccount,
  getAccountDetail,
  listAccounts,
  listParentOptions,
  resetAccountStore,
  updateAccount,
} from "./accounts.server";
import { listQuerySchema } from "../model/schemas";
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

export const listAccountsFn = createServerFn({ method: "GET" })
  .validator(listQuerySchema)
  .handler(async ({ data }) => listAccounts(data));

export const getAccountFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const detail = getAccountDetail(data.id);
    if (!detail) throw new Error(`Account not found: ${data.id}`);
    return detail;
  });

export const listParentsFn = createServerFn({ method: "GET" }).handler(
  async () => listParentOptions(),
);

export const createAccountFn = createServerFn({ method: "POST" })
  .validator(z.object({ payload: z.unknown() }))
  .handler(async ({ data }) => createAccount(resolveActor(), data.payload));

export const updateAccountFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), payload: z.unknown() }))
  .handler(async ({ data }) =>
    updateAccount(resolveActor(), data.id, data.payload),
  );

export const resetStoreFn = createServerFn({ method: "POST" }).handler(
  async () => {
    resetAccountStore();
    return { ok: true as const };
  },
);
