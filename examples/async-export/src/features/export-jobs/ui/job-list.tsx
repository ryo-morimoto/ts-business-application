"use client";

import { criteriaLabel } from "../model/criteria-label";
import type { ExportJob } from "../model/export-job";
import { jobStatusLabel } from "../model/job-status";
import { downloadUrl } from "../lib/api";

type Props = {
  jobs: ExportJob[];
  highlightId: string | null;
  loading: boolean;
  onRefresh: () => void;
  onReuseCriteria: (job: ExportJob) => void;
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ja-JP", { hour12: false });
  } catch {
    return iso;
  }
}

export function JobList({
  jobs,
  highlightId,
  loading,
  onRefresh,
  onReuseCriteria,
}: Props) {
  return (
    <section className="panel" aria-labelledby="jobs-heading">
      <div className="job-title">
        <h2 id="jobs-heading">出力依頼</h2>
        <button
          type="button"
          className="secondary"
          data-testid="refresh-jobs"
          onClick={onRefresh}
          disabled={loading}
        >
          最新の状態を取得
        </button>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        受付済み / 処理中 / 完了 / 失敗を区別します。完了以外では成果物を渡しません。
      </p>

      {jobs.length === 0 ? (
        <div className="empty" data-testid="jobs-empty">
          まだ依頼がありません。左の一覧で条件を決め、「この条件でファイル出力」を押してください。
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {jobs.map((job) => (
            <li
              key={job.id}
              className={`job-card${highlightId === job.id ? " highlight" : ""}`}
              data-testid={`job-card-${job.id}`}
              data-status={job.status}
            >
              <div className="job-title">
                <strong data-testid={`job-id-${job.id}`}>{job.id}</strong>
                <span
                  className={`badge ${job.status}`}
                  data-testid={`job-status-${job.id}`}
                >
                  {jobStatusLabel(job.status)}
                </span>
              </div>
              <div className="job-meta">
                <span>依頼者: {job.requestedBy}</span>
                <span>受付: {formatTime(job.requestedAt)}</span>
                {job.finishedAt && (
                  <span>終了: {formatTime(job.finishedAt)}</span>
                )}
                {job.estimatedRowCount !== null && (
                  <span>受付時推定: {job.estimatedRowCount} 件</span>
                )}
              </div>
              <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
                条件（受付時固定）:{" "}
                <span
                  className="criteria-chip"
                  data-testid={`job-criteria-${job.id}`}
                >
                  {criteriaLabel(job.criteria)}
                </span>
              </p>

              {job.status === "accepted" || job.status === "running" ? (
                <p className="muted" data-testid={`job-progress-${job.id}`}>
                  処理中です。画面を離れても、この一覧から進捗を確認できます。
                </p>
              ) : null}

              {job.status === "completed" && job.artifact ? (
                <div className="actions" style={{ marginTop: "0.5rem" }}>
                  <a
                    className="btn"
                    data-testid={`download-${job.id}`}
                    href={downloadUrl(job.id)}
                  >
                    成果物を受け取る（{job.artifact.rowCount} 行）
                  </a>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    期限: {formatTime(job.artifact.expiresAt)}
                  </span>
                </div>
              ) : null}

              {job.status === "failed" ? (
                <div
                  className="banner error"
                  role="alert"
                  data-testid={`job-failure-${job.id}`}
                  style={{ marginBottom: 0 }}
                >
                  <div>
                    <strong>失敗:</strong> {job.failureMessage}
                  </div>
                  <div className="muted" style={{ marginTop: "0.35rem" }}>
                    理由コード: {job.failureReason}
                  </div>
                  <div className="actions" style={{ marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="secondary"
                      data-testid={`retry-${job.id}`}
                      onClick={() => onReuseCriteria(job)}
                    >
                      同じ条件で再依頼の準備
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
