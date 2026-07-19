"use client";

import type { ApprovalRequest } from "@approval-flow/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createRequest, fetchRequests } from "@/lib/api-client";
import { ActorBar } from "./actor-bar";

const ACTOR_KEY = "approval-flow-actor";

export function RequestList() {
  const [actorId, setActorId] = useState("author");
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(ACTOR_KEY);
    if (saved) setActorId(saved);
  }, []);

  const load = useCallback(async (actor: string) => {
    setError(null);
    try {
      setItems(await fetchRequests({ actorId: actor }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ACTOR_KEY, actorId);
    void load(actorId);
  }, [actorId, load]);

  async function onCreate() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createRequest({ title: title.trim(), body: "" }, { actorId });
      setTitle("");
      await load(actorId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ActorBar actorId={actorId} onChange={setActorId} />

      <div className="toolbar">
        <label className="field">
          <span>New request title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
        </label>
        <button type="button" disabled={busy || !title.trim()} onClick={onCreate}>
          Create draft
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Author</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/requests/${r.id}?actor=${actorId}`}>{r.id}</Link>
              </td>
              <td>{r.title}</td>
              <td>
                <span className="badge">{r.status}</span>
              </td>
              <td>{r.authorId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
