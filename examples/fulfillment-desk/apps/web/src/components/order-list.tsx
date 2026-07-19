"use client";

import type {
  CompositionProvenance,
  OrderStatus,
  OrderSummary,
} from "@fulfillment-desk/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchOrders,
  fetchOrdersWithRawQuery,
  formatAppError,
} from "@/lib/api-client";
import { ActorBar } from "./actor-bar";
import { ProvenancePanel } from "./provenance-panel";

const ACTOR_KEY = "fulfillment-desk-actor";

const STATUSES: Array<OrderStatus | ""> = [
  "",
  "ready_to_ship",
  "shipped",
  "cancelled",
];

const WAREHOUSES = ["", "wh_tokyo", "wh_osaka"] as const;

export function OrderList() {
  const [actorId, setActorId] = useState("operator");
  const [status, setStatus] = useState<OrderStatus | "">("ready_to_ship");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [allowedFilters, setAllowedFilters] = useState<string[]>([
    "status",
    "warehouseId",
  ]);
  const [provenance, setProvenance] = useState<CompositionProvenance | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [probeMessage, setProbeMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(ACTOR_KEY);
    if (saved) setActorId(saved);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setProbeMessage(null);
    const result = await fetchOrders(
      {
        status: status || undefined,
        warehouseId: warehouseId || undefined,
      },
      { actorId },
    );
    if (!result.ok) {
      setItems([]);
      setProvenance(null);
      setError(formatAppError(result.error));
      return;
    }
    setItems(result.items);
    setAllowedFilters(result.meta.allowedFilters);
    setProvenance(result.provenance);
  }, [actorId, status, warehouseId]);

  useEffect(() => {
    window.localStorage.setItem(ACTOR_KEY, actorId);
    void load();
  }, [actorId, load]);

  async function probeUnsupportedFilter() {
    setProbeMessage(null);
    setError(null);
    const result = await fetchOrdersWithRawQuery(
      "status=ready_to_ship&q=acme&customerName=Acme",
      { actorId },
    );
    if (!result.ok) {
      setProbeMessage(formatAppError(result.error));
      return;
    }
    setProbeMessage("unexpected success");
  }

  return (
    <>
      <ActorBar actorId={actorId} onChange={setActorId} />

      <div className="toolbar">
        <label className="field">
          <span>Status (SoR filter)</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "(any)"}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Warehouse (SoR filter)</span>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {WAREHOUSES.map((w) => (
              <option key={w || "all"} value={w}>
                {w || "(any)"}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary" onClick={() => void load()}>
          Refresh
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void probeUnsupportedFilter()}
          data-testid="probe-unsupported"
        >
          Probe free-text filter
        </button>
      </div>

      <p className="muted" data-testid="allowed-filters">
        External OMS allowed filters:{" "}
        <code>{allowedFilters.join(", ")}</code>
        {" — "}
        free-text / customer name are not accepted (structured error, not
        silently ignored, not client-side faked).
      </p>

      {error ? (
        <p className="error" data-testid="list-error">
          {error}
        </p>
      ) : null}
      {probeMessage ? (
        <p className="error" data-testid="probe-error">
          {probeMessage}
        </p>
      ) : null}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Warehouse</th>
            <th>Customer id</th>
            <th>Lines</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id}>
              <td>
                <Link href={`/orders/${o.id}?actor=${actorId}`}>{o.id}</Link>
              </td>
              <td>
                <span className="badge">{o.status}</span>
              </td>
              <td>{o.warehouseId}</td>
              <td className="muted">{o.customerId}</td>
              <td>{o.lineCount}</td>
            </tr>
          ))}
          {items.length === 0 && !error ? (
            <tr>
              <td colSpan={5} className="muted">
                No orders for these filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <ProvenancePanel provenance={provenance} />
    </>
  );
}
