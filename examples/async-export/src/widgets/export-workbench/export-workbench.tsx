"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createExportJobAction } from "@/features/export-jobs/actions/create-export-job";
import { fetchExportJobs } from "@/features/export-jobs/lib/api";
import { criteriaLabel } from "@/features/export-jobs/model/criteria-label";
import type { ExportCriteria } from "@/features/export-jobs/model/export-criteria";
import type { ExportJob } from "@/features/export-jobs/model/export-job";
import { EXPORT_ROW_LIMIT } from "@/features/export-jobs/model/limits";
import { JobList } from "@/features/export-jobs/ui/job-list";
import {
  fetchShipments,
  ShipmentFilters,
  ShipmentTable,
} from "@/features/shipments";
import {
  ActorBar,
  readActorCookie,
  setActorCookie,
} from "@/shared/actor";

/**
 * Widget: 一覧 feature と 出力 feature を合成する。
 * features 同士は互いに import しない — 合成はここ（または app）で行う。
 */

function hasActiveJobs(jobs: ExportJob[]): boolean {
  return jobs.some((j) => j.status === "accepted" || j.status === "running");
}

export function ExportWorkbench() {
  const [actorId, setActorId] = useState("clerk");
  const [draftCriteria, setDraftCriteria] = useState<ExportCriteria>({});
  const [appliedCriteria, setAppliedCriteria] = useState<ExportCriteria>({});
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof fetchShipments>>["items"]
  >([]);
  const [total, setTotal] = useState(0);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [flash, setFlash] = useState<
    { type: "ok" | "error" | "info"; message: string } | null
  >(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = readActorCookie();
    setActorCookie(existing);
    setActorId(existing);
  }, []);

  const loadList = useCallback(async (criteria: ExportCriteria) => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetchShipments(criteria);
      setItems(res.items);
      setTotal(res.total);
      setWarehouseIds(res.actor.warehouseIds);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
      setItems([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const list = await fetchExportJobs();
      setJobs(list);
    } catch {
      setFlash({
        type: "error",
        message: "依頼一覧の取得に失敗しました。再試行してください。",
      });
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(appliedCriteria);
    void loadJobs();
  }, [actorId, appliedCriteria, loadList, loadJobs]);

  useEffect(() => {
    if (!hasActiveJobs(jobs)) return;
    const t = setInterval(() => {
      void loadJobs();
    }, 500);
    return () => clearInterval(t);
  }, [jobs, loadJobs]);

  const emptyReason = useMemo(() => {
    if (listLoading || listError || items.length > 0) return null;
    if (warehouseIds.length === 0) return "no-access" as const;
    return "no-match" as const;
  }, [listLoading, listError, items.length, warehouseIds.length]);

  const canRequest = !listLoading && !requesting && warehouseIds.length > 0;

  const requestBlockedReason = useMemo(() => {
    if (warehouseIds.length === 0) {
      return "閲覧できる倉庫がないため、ファイル出力を依頼できません。";
    }
    return null;
  }, [warehouseIds.length]);

  async function handleRequestExport() {
    setRequesting(true);
    setFlash(null);
    try {
      const result = await createExportJobAction(appliedCriteria);
      if (!result.ok) {
        setFlash({ type: "error", message: result.message });
        return;
      }
      setHighlightId(result.job.id);
      setFlash({
        type: "ok",
        message: `依頼を受け付けました。依頼番号 ${result.job.id}。ファイル本体はまだ渡していません — 進捗が「完了」になってから受け取ってください。`,
      });
      await loadJobs();
      liveRef.current?.focus();
    } catch {
      setFlash({
        type: "error",
        message:
          "依頼の送信に失敗しました。受付できたかは依頼一覧で確認できます。同じ条件で再送しても別依頼として受け付けます。",
      });
    } finally {
      setRequesting(false);
    }
  }

  function handleActorChange(id: string) {
    setActorCookie(id);
    setActorId(id);
    setHighlightId(null);
    setFlash(null);
  }

  function handleReuseCriteria(job: ExportJob) {
    setDraftCriteria(job.criteria);
    setAppliedCriteria(job.criteria);
    setFlash({
      type: "info",
      message: `依頼 ${job.id} と同じ条件を一覧に載せました。必要なら調整してから再依頼してください。`,
    });
  }

  async function revokeScopeDemo() {
    await fetch("/api/testing/revoke-scope", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-actor-id": actorId,
      },
      body: JSON.stringify({ actorId, warehouseIds: [] }),
    });
    setFlash({
      type: "info",
      message:
        "デモ: この利用者の倉庫権限を空にしました。処理中の依頼は権限不足で失敗します。一覧も空になります。",
    });
    await loadList(appliedCriteria);
  }

  async function restoreScopeDemo() {
    await fetch(
      `/api/testing/revoke-scope?actorId=${encodeURIComponent(actorId)}`,
      {
        method: "DELETE",
        headers: { "x-actor-id": actorId },
      },
    );
    setFlash({
      type: "info",
      message: "デモ: 倉庫権限を初期状態に戻しました。",
    });
    await loadList(appliedCriteria);
  }

  return (
    <div>
      <ActorBar actorId={actorId} onChange={handleActorChange} />

      <div
        ref={liveRef}
        tabIndex={-1}
        aria-live="polite"
        data-testid="flash"
        className={
          flash
            ? `banner ${flash.type === "ok" ? "ok" : flash.type === "error" ? "error" : "info"}`
            : "sr-only"
        }
      >
        {flash?.message}
      </div>

      <div className="layout">
        <section className="panel" aria-labelledby="list-heading">
          <h2 id="list-heading">出荷明細一覧</h2>
          <ShipmentFilters
            criteria={draftCriteria}
            onChange={setDraftCriteria}
            onSubmitFilters={() => setAppliedCriteria(draftCriteria)}
          />

          <div className="meta-row">
            <span>
              適用中の条件:{" "}
              <span className="criteria-chip" data-testid="applied-criteria">
                {criteriaLabel(appliedCriteria)}
              </span>
            </span>
            <span>出力上限: {EXPORT_ROW_LIMIT} 件 / 依頼</span>
          </div>

          <div className="actions" style={{ marginBottom: "0.75rem" }}>
            <button
              type="button"
              data-testid="request-export"
              onClick={() => void handleRequestExport()}
              disabled={!canRequest || !!requestBlockedReason}
              aria-describedby={
                requestBlockedReason ? "export-blocked-reason" : undefined
              }
            >
              {requesting ? "依頼を送信中…" : "この条件でファイル出力"}
            </button>
            {requestBlockedReason ? (
              <span
                id="export-blocked-reason"
                className="muted"
                data-testid="export-blocked"
              >
                {requestBlockedReason}
              </span>
            ) : (
              <span className="muted">
                いま見えている条件のスナップショットで依頼します（受付後に条件を変えても依頼内容は変わりません）
              </span>
            )}
          </div>

          <ShipmentTable
            items={items}
            total={total}
            loading={listLoading}
            error={listError}
            emptyReason={emptyReason}
          />

          <details className="demo-tools">
            <summary>デモ用: 処理中の権限剥奪</summary>
            <p className="muted">
              依頼直後に権限を空にすると、処理時に「権限不足」で失敗します（部分的な成果物は渡しません）。
            </p>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                data-testid="demo-revoke-scope"
                onClick={() => void revokeScopeDemo()}
              >
                倉庫権限を空にする
              </button>
              <button
                type="button"
                className="secondary"
                data-testid="demo-restore-scope"
                onClick={() => void restoreScopeDemo()}
              >
                権限を戻す
              </button>
            </div>
          </details>
        </section>

        <JobList
          jobs={jobs}
          highlightId={highlightId}
          loading={jobsLoading}
          onRefresh={() => void loadJobs()}
          onReuseCriteria={handleReuseCriteria}
        />
      </div>
    </div>
  );
}
