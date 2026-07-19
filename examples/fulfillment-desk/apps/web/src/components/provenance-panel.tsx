"use client";

import type { CompositionProvenance } from "@fulfillment-desk/contracts";

type Props = {
  provenance: CompositionProvenance | null;
};

/** Shows which external SoRs the BFF called — the composition is not a black box. */
export function ProvenancePanel({ provenance }: Props) {
  if (!provenance) return null;
  return (
    <div className="card provenance" data-testid="provenance">
      <p className="muted" style={{ marginTop: 0 }}>
        BFF provenance · <code>{provenance.correlationId}</code> ·{" "}
        {provenance.totalDurationMs}ms total
      </p>
      <table>
        <thead>
          <tr>
            <th>System</th>
            <th>Operation</th>
            <th>Ok</th>
            <th>ms</th>
          </tr>
        </thead>
        <tbody>
          {provenance.calls.map((c, i) => (
            <tr key={`${c.system}-${c.operation}-${i}`}>
              <td>
                <code>{c.system}</code>
              </td>
              <td>{c.operation}</td>
              <td className={c.ok ? "ok" : "error"}>{c.ok ? "yes" : "no"}</td>
              <td>{c.durationMs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
