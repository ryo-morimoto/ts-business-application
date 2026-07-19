"use client";

import type { SelectionMode } from "@/lib/url-state";

type Props = {
  selectionMode: SelectionMode;
  pageSelectedCount: number;
  totalMatching: number;
  excludedCount: number;
  onModeChange: (mode: SelectionMode) => void;
  onClear: () => void;
  onOpenBulk: () => void;
};

export function SelectionBar({
  selectionMode,
  pageSelectedCount,
  totalMatching,
  excludedCount,
  onModeChange,
  onClear,
  onOpenBulk,
}: Props) {
  const allCount = Math.max(0, totalMatching - excludedCount);
  const effectiveCount =
    selectionMode === "page" ? pageSelectedCount : allCount;

  return (
    <div className="selection-bar" role="region" aria-label="Selection">
      <label className="field" style={{ minWidth: "auto" }}>
        <span>Selection scope</span>
        <select
          value={selectionMode}
          onChange={(e) => onModeChange(e.target.value as SelectionMode)}
        >
          <option value="page">Current page only</option>
          <option value="all_matching">All matching filter</option>
        </select>
      </label>

      <div>
        Selected:{" "}
        <strong data-testid="selection-count">{effectiveCount}</strong>
        {selectionMode === "page" ? (
          <span className="muted"> on this page</span>
        ) : (
          <span className="muted">
            {" "}
            matching filter
            {excludedCount > 0 ? ` (−${excludedCount} excluded)` : ""}
          </span>
        )}
      </div>

      <span className="badge">
        {selectionMode === "page" ? "mode: page" : "mode: all_matching"}
      </span>

      <button type="button" className="secondary" onClick={onClear}>
        Clear selection
      </button>
      <button
        type="button"
        disabled={effectiveCount === 0}
        onClick={onOpenBulk}
      >
        Bulk change assignee…
      </button>
    </div>
  );
}
