"use client";

import type {
  ShipmentCriteria,
  ShipmentStatus,
  WarehouseId,
} from "@/entities/shipment";

const WAREHOUSES: { value: "" | WarehouseId; label: string }[] = [
  { value: "", label: "すべて（権限内）" },
  { value: "WH-A", label: "WH-A" },
  { value: "WH-B", label: "WH-B" },
  { value: "WH-C", label: "WH-C" },
  { value: "WH-X", label: "WH-X" },
];

const STATUSES: { value: "" | ShipmentStatus; label: string }[] = [
  { value: "", label: "すべて" },
  { value: "draft", label: "draft" },
  { value: "allocated", label: "allocated" },
  { value: "shipped", label: "shipped" },
  { value: "cancelled", label: "cancelled" },
];

type Props = {
  criteria: ShipmentCriteria;
  onChange: (next: ShipmentCriteria) => void;
  onSubmitFilters: () => void;
};

export function ShipmentFilters({
  criteria,
  onChange,
  onSubmitFilters,
}: Props) {
  return (
    <form
      className="toolbar"
      aria-label="一覧の絞り込み条件"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmitFilters();
      }}
    >
      <label className="field">
        <span>倉庫</span>
        <select
          data-testid="filter-warehouse"
          value={criteria.warehouseId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...criteria,
              warehouseId: v === "" ? undefined : (v as WarehouseId),
            });
          }}
        >
          {WAREHOUSES.map((w) => (
            <option key={w.value || "all"} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>状態</span>
        <select
          data-testid="filter-status"
          value={criteria.status ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...criteria,
              status: v === "" ? undefined : (v as ShipmentStatus),
            });
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value || "all"} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>担当</span>
        <input
          data-testid="filter-assignee"
          value={criteria.assigneeId ?? ""}
          placeholder="例: clerk"
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange({
              ...criteria,
              assigneeId: v === "" ? undefined : v,
            });
          }}
        />
      </label>

      <label className="field">
        <span>予定日 From</span>
        <input
          type="date"
          data-testid="filter-date-from"
          value={criteria.plannedShipDateFrom ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...criteria,
              plannedShipDateFrom: v === "" ? undefined : v,
            });
          }}
        />
      </label>

      <label className="field">
        <span>予定日 To</span>
        <input
          type="date"
          data-testid="filter-date-to"
          value={criteria.plannedShipDateTo ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...criteria,
              plannedShipDateTo: v === "" ? undefined : v,
            });
          }}
        />
      </label>

      <button type="submit" className="secondary" data-testid="apply-filters">
        条件を適用
      </button>
    </form>
  );
}
