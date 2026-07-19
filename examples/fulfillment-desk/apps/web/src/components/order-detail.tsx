"use client";

import type {
  CompositionProvenance,
  OrderDetail as OrderDetailType,
} from "@fulfillment-desk/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  fetchOrder,
  formatAppError,
  postShip,
} from "@/lib/api-client";
import { ActorBar } from "./actor-bar";
import { ProvenancePanel } from "./provenance-panel";

type Props = {
  id: string;
  initialActor: string;
};

export function OrderDetail({ id, initialActor }: Props) {
  const router = useRouter();
  const [actorId, setActorId] = useState(initialActor);
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [provenance, setProvenance] = useState<CompositionProvenance | null>(
    null,
  );
  const [carrierCode, setCarrierCode] = useState("YAMATO");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const result = await fetchOrder(id, { actorId });
    if (!result.ok) {
      setOrder(null);
      setProvenance(null);
      setError(formatAppError(result.error));
      return;
    }
    setOrder(result.order);
    setProvenance(result.provenance);
  }, [actorId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onShip() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await postShip(id, carrierCode, { actorId });
    setBusy(false);
    if (!result.ok) {
      setError(formatAppError(result.error));
      return;
    }
    setOrder(result.result.order);
    setProvenance(result.result.provenance);
    setMessage(
      `shipped · tracking ${result.result.trackingNumber} · status=${result.result.order.status}`,
    );
    router.refresh();
  }

  if (!order && !error) {
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
      <h1>Order {id}</h1>
      <p className="muted">
        Detail is a <strong>BFF composition</strong>: OMS order + customer API +
        inventory API. Failures mid-pipeline become{" "}
        <code>composition_failed</code> — the BFF does not invent missing data.
      </p>

      <ActorBar
        actorId={actorId}
        onChange={(next) => {
          setActorId(next);
          router.replace(`/orders/${id}?actor=${next}`);
        }}
      />

      {order ? (
        <div className="card">
          <p>
            Status: <span className="badge">{order.status}</span>
            {" · "}
            Warehouse: <code>{order.warehouseId}</code>
          </p>
          <p>
            Customer: <strong>{order.customer.name}</strong> (
            {order.customer.id}) · Ship city: {order.customer.shipCity}
          </p>
          <p className="muted">Updated: {order.updatedAt}</p>
          <p>
            Stock check:{" "}
            {order.canShipByStock ? (
              <span className="ok">all lines covered</span>
            ) : (
              <span className="error">shortage on one or more lines</span>
            )}
          </p>

          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Qty</th>
                <th>Available</th>
                <th>Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.sku}>
                  <td>{line.sku}</td>
                  <td>{line.qty}</td>
                  <td>{line.availableQty}</td>
                  <td className={line.shortfall > 0 ? "error" : undefined}>
                    {line.shortfall}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ProvenancePanel provenance={provenance} />

      <div className="toolbar">
        <label className="field">
          <span>Carrier code</span>
          <select
            value={carrierCode}
            onChange={(e) => setCarrierCode(e.target.value)}
            data-testid="carrier-select"
          >
            <option value="YAMATO">YAMATO</option>
            <option value="SAGAWA">SAGAWA</option>
            <option value="SIMULATE_RATE_LIMIT">
              SIMULATE_RATE_LIMIT (retry_after 30s)
            </option>
            <option value="SIMULATE_TIMEOUT">
              SIMULATE_TIMEOUT (budget overrun)
            </option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy || order?.status !== "ready_to_ship"}
          onClick={() => void onShip()}
          data-testid="ship-button"
        >
          Confirm ship
        </button>
      </div>

      {message ? (
        <p className="ok" data-testid="ship-ok">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error" data-testid="ship-error">
          {error}
        </p>
      ) : null}
    </main>
  );
}
