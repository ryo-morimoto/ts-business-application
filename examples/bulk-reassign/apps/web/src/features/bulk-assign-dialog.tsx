import { useId, useState } from "react";
import type { SelectionMode } from "../url-state";

type Props = {
  open: boolean;
  selectionMode: SelectionMode;
  targetCount: number;
  pageIds: string[];
  onClose: () => void;
  onSubmit: (assigneeId: string) => void;
  submitting: boolean;
};

export function BulkAssignDialog({
  open,
  selectionMode,
  targetCount,
  pageIds,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const titleId = useId();
  const [assigneeId, setAssigneeId] = useState("u-9");

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>Bulk change assignee</h2>
        <p className="muted">
          Scope:{" "}
          <strong>
            {selectionMode === "page" ? "current page" : "all matching filter"}
          </strong>
          . Targets (UI estimate): <strong>{targetCount}</strong>
          {selectionMode === "page" ? (
            <>
              {" "}
              (
              <code>{pageIds.join(", ") || "none"}</code>)
            </>
          ) : (
            <>
              . Server recomputes matching rows; not a silent page-only apply.
            </>
          )}
        </p>
        <label className="field">
          <span>New assignee id</span>
          <input
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!assigneeId.trim() || submitting || targetCount === 0}
            onClick={() => onSubmit(assigneeId.trim())}
          >
            {submitting ? "Submitting…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
