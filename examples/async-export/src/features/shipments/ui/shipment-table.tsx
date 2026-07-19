"use client";

import type { Shipment } from "@/entities/shipment";

type Props = {
  items: Shipment[];
  total: number;
  loading: boolean;
  error: string | null;
  emptyReason: "no-access" | "no-match" | null;
};

export function ShipmentTable({
  items,
  total,
  loading,
  error,
  emptyReason,
}: Props) {
  if (loading) {
    return (
      <div className="empty" role="status" data-testid="shipments-loading">
        出荷明細を読み込み中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="banner error" role="alert" data-testid="shipments-error">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    if (emptyReason === "no-access") {
      return (
        <div className="empty" data-testid="shipments-no-access">
          <strong>閲覧できる出荷明細がありません。</strong>
          <p>
            倉庫の閲覧権限がないため、一覧もファイル出力も利用できません。権限の付与を申請してください。
          </p>
        </div>
      );
    }
    return (
      <div className="empty" data-testid="shipments-no-match">
        <strong>条件に一致する行がありません。</strong>
        <p>
          いまの絞り込みでは 0 件です。条件を緩めるか解除してから、出力を依頼してください（0
          件のまま依頼すると失敗になります）。
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="meta-row" data-testid="shipments-total">
        <span>
          表示 {items.length} 件 / 一致 <strong>{total}</strong> 件（確定値）
        </span>
      </p>
      <div className="table-wrap">
        <table data-testid="shipments-table">
          <caption className="sr-only">出荷明細一覧</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">受注</th>
              <th scope="col">倉庫</th>
              <th scope="col">状態</th>
              <th scope="col">担当</th>
              <th scope="col">SKU</th>
              <th scope="col">数量</th>
              <th scope="col">予定日</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.orderNo}</td>
                <td>{row.warehouseId}</td>
                <td>{row.status}</td>
                <td>{row.assigneeId}</td>
                <td>{row.sku}</td>
                <td>{row.quantity}</td>
                <td>{row.plannedShipDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
