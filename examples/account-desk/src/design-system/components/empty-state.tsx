import type { ReactNode } from "react";

export type EmptyKind = "empty" | "zero" | "forbidden" | "error";

const copy: Record<
  EmptyKind,
  { title: string; body: string }
> = {
  empty: {
    title: "取引先がまだありません",
    body: "新規登録するか、シードをリセットしてください。",
  },
  zero: {
    title: "条件に一致する取引先がありません",
    body: "検索・絞り込みを見直すか、条件を解除してください。",
  },
  forbidden: {
    title: "この操作の権限がありません",
    body: "参照専用ロールでは編集できません。actor を切り替えてください。",
  },
  error: {
    title: "読み込みに失敗しました",
    body: "通信またはサーバエラーです。再試行してください。",
  },
};

export function EmptyState({
  kind,
  action,
  title,
  body,
}: {
  kind: EmptyKind;
  action?: ReactNode;
  title?: string;
  body?: string;
}) {
  const base = copy[kind];
  return (
    <div
      className="border border-dashed border-desk-border bg-desk-surface px-4 py-8 text-center"
      data-testid={`empty-${kind}`}
      role="status"
    >
      <p className="text-sm font-semibold text-desk-text">
        {title ?? base.title}
      </p>
      <p className="mt-1 text-xs text-desk-muted">{body ?? base.body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
