"use client";

import type { ApprovalRequest, TransitionAction } from "@approval-flow/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchRequest, postTransition } from "@/lib/api-client";
import { ActorBar } from "./actor-bar";

type Props = {
  id: string;
  initialActor: string;
};

export function RequestDetail({ id, initialActor }: Props) {
  const router = useRouter();
  const [actorId, setActorId] = useState(initialActor);
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRequest(await fetchRequest(id, { actorId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, [actorId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: TransitionAction) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await postTransition(
      id,
      { action, reason: reason || undefined },
      { actorId },
    );
    setBusy(false);
    if (!result.ok) {
      setError(
        `${result.error.reason}${
          result.error.currentStatus
            ? ` (status=${result.error.currentStatus})`
            : ""
        }`,
      );
      return;
    }
    setRequest(result.request);
    setMessage(`${action} → ${result.request.status}`);
    setReason("");
    router.refresh();
  }

  if (!request && !error) {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <p>
        <Link href={`/?actor=${actorId}`}>← List</Link>
      </p>
      <h1>{request?.title ?? id}</h1>
      <p className="muted">
        <code>{id}</code> · Next full-stack transitions
      </p>

      <ActorBar
        actorId={actorId}
        onChange={(next) => {
          setActorId(next);
          router.replace(`/requests/${id}?actor=${next}`);
        }}
      />

      {request ? (
        <div className="card">
          <p>
            Status: <span className="badge">{request.status}</span>
          </p>
          <p className="muted">Author: {request.authorId}</p>
          <p>{request.body || "(no body)"}</p>
          {request.rejectReason ? (
            <p className="error">Reject reason: {request.rejectReason}</p>
          ) : null}
          <p className="muted">Updated: {request.updatedAt}</p>
        </div>
      ) : null}

      <div className="toolbar" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <label className="field">
          <span>Reject reason (required for reject)</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why rejected?"
          />
        </label>
      </div>

      <div className="actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("submit")}
        >
          Submit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("approve")}
        >
          Approve
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => void run("reject")}
        >
          Reject
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void run("resubmit")}
        >
          Resubmit
        </button>
      </div>

      {message ? <p className="ok" data-testid="transition-ok">{message}</p> : null}
      {error ? (
        <p className="error" data-testid="transition-error">
          {error}
        </p>
      ) : null}
    </main>
  );
}
