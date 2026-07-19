import type {
  ApprovalRequest,
  CreateRequestBody,
  TransitionBody,
  TransitionError,
} from "@approval-flow/contracts";

export type ClientOpts = { actorId: string };

function headers(actorId: string, jsonBody = false): Headers {
  const h = new Headers();
  h.set("x-actor-id", actorId);
  if (jsonBody) h.set("Content-Type", "application/json");
  return h;
}

export async function fetchRequests(
  opts: ClientOpts,
): Promise<ApprovalRequest[]> {
  const res = await fetch("/api/requests", {
    headers: headers(opts.actorId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const data = (await res.json()) as { items: ApprovalRequest[] };
  return data.items;
}

export async function fetchRequest(
  id: string,
  opts: ClientOpts,
): Promise<ApprovalRequest> {
  const res = await fetch(`/api/requests/${id}`, {
    headers: headers(opts.actorId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`get failed: ${res.status}`);
  return (await res.json()) as ApprovalRequest;
}

export async function createRequest(
  body: CreateRequestBody,
  opts: ClientOpts,
): Promise<ApprovalRequest> {
  const res = await fetch("/api/requests", {
    method: "POST",
    headers: headers(opts.actorId, true),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  return (await res.json()) as ApprovalRequest;
}

export type TransitionResult =
  | { ok: true; request: ApprovalRequest }
  | { ok: false; status: number; error: TransitionError };

export async function postTransition(
  id: string,
  body: TransitionBody,
  opts: ClientOpts,
): Promise<TransitionResult> {
  const res = await fetch(`/api/requests/${id}/transitions`, {
    method: "POST",
    headers: headers(opts.actorId, true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data as TransitionError,
    };
  }
  return { ok: true, request: data as ApprovalRequest };
}
