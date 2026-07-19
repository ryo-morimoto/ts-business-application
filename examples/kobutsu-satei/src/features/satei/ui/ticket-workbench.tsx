import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as React from "react";
import {
  acceptTicketFn,
  patchTicketFn,
  repinRuleSetFn,
  reportSuspiciousFn,
} from "../api/satei.functions";
import { sateiQueries } from "../api/satei.queries";
import { evaluate } from "../model/evaluate";
import { CATEGORY_LABELS } from "../model/seed-rules";
import {
  addLine,
  getFieldValueAsString,
  removeLine,
  setFieldValue,
} from "../model/ticket-paths";
import type {
  Category,
  FormFieldPlan,
  FormPlan,
  SuspiciousReasonCode,
  Ticket,
} from "../model/types";
import { CATEGORIES } from "../model/types";
import { useActor } from "~/shared/actor/actor-context";

type Props = { ticketId: string };

function FieldInput({
  field,
  value,
  disabled,
  onChange,
  invalid,
}: {
  field: FormFieldPlan;
  value: string;
  disabled: boolean;
  onChange: (v: string | number | boolean) => void;
  invalid?: boolean;
}) {
  const tid = field.lineId
    ? `field-${field.lineId}-${field.id}`
    : `field-${field.id}`;
  const cls = `w-full rounded border px-2 py-1 dark:bg-gray-950 ${
    invalid
      ? "border-red-500 dark:border-red-600"
      : "border-gray-300 dark:border-gray-700"
  }`;

  if (field.kind === "boolean") {
    return (
      <select
        data-testid={tid}
        className={cls}
        disabled={disabled || field.disabled}
        value={value === "" ? "" : value}
        onChange={(e) => {
          if (e.target.value === "") return;
          onChange(e.target.value === "true");
        }}
      >
        <option value="">—</option>
        <option value="true">はい</option>
        <option value="false">いいえ</option>
      </select>
    );
  }
  if (field.kind === "select" && field.options) {
    return (
      <select
        data-testid={tid}
        className={cls}
        disabled={disabled || field.disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === "number") {
    return (
      <input
        data-testid={tid}
        type="number"
        min={field.min}
        className={cls}
        disabled={disabled || field.disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (field.kind === "textarea") {
    return (
      <textarea
        data-testid={tid}
        className={cls}
        disabled={disabled || field.disabled}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      data-testid={tid}
      type="text"
      className={cls}
      disabled={disabled || field.disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function fieldInvalid(plan: FormPlan, field: FormFieldPlan): boolean {
  if (!field.required || !field.visible) return false;
  const key = field.lineId ? `${field.lineId}.${field.id}` : field.id;
  return plan.blocks.some(
    (b) =>
      b.code === "missing_required" &&
      (b.message.includes(key) || b.message.includes(field.id)),
  );
}

const GROUP_ORDER = [
  "ticket",
  "line",
  "appraisal",
  "seller",
  "idCheck",
  "aml",
] as const;

const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  ticket: "チケット",
  line: "明細",
  appraisal: "真贋",
  seller: "売主",
  idCheck: "本人確認",
  aml: "犯収法 (デモ)",
};

/** Render FormPlan fields only (rule-driven). */
function PlanFields({
  plan,
  draft,
  readOnly,
  onChangeField,
  onRemoveLine,
}: {
  plan: FormPlan;
  draft: Ticket;
  readOnly: boolean;
  onChangeField: (field: FormFieldPlan, v: string | number | boolean) => void;
  onRemoveLine: (lineId: string) => void;
}) {
  // Ticket-level groups
  const ticketGroups = GROUP_ORDER.filter((g) => g !== "line");

  return (
    <>
      {ticketGroups.map((g) => {
        const fields = plan.fields.filter(
          (f) => f.group === g && f.visible && !f.lineId,
        );
        if (fields.length === 0) return null;
        return (
          <fieldset
            key={g}
            className="space-y-2 rounded border border-gray-200 p-3 dark:border-gray-800"
            data-testid={`group-${g}`}
          >
            <legend className="px-1 text-sm font-semibold">
              {GROUP_LABEL[g]}
            </legend>
            {fields.map((field) => (
              <label key={field.id} className="block text-sm">
                <span className="mb-0.5 block text-gray-600 dark:text-gray-400">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                <FieldInput
                  field={field}
                  value={getFieldValueAsString(draft, field)}
                  disabled={readOnly}
                  invalid={fieldInvalid(plan, field)}
                  onChange={(v) => onChangeField(field, v)}
                />
              </label>
            ))}
          </fieldset>
        );
      })}

      {/* One card per line, fields from plan only */}
      {draft.lines.map((line) => {
        const lineFields = plan.fields.filter(
          (f) => f.group === "line" && f.lineId === line.id && f.visible,
        );
        if (lineFields.length === 0) return null;
        return (
          <fieldset
            key={line.id}
            className="space-y-2 rounded border border-dashed border-gray-300 p-3 dark:border-gray-700"
            data-testid={`line-${line.id}`}
            data-category={line.category}
          >
            <legend className="flex w-full items-center justify-between gap-2 px-1 text-sm font-semibold">
              <span className="font-mono text-xs">
                {line.id} · {CATEGORY_LABELS[line.category] ?? line.category}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  className="text-xs font-normal text-red-600"
                  data-testid={`remove-line-${line.id}`}
                  onClick={() => onRemoveLine(line.id)}
                >
                  削除
                </button>
              )}
            </legend>
            {lineFields.map((field) => (
              <label
                key={`${field.lineId}-${field.id}`}
                className="block text-sm"
              >
                <span className="mb-0.5 block text-gray-600 dark:text-gray-400">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                <FieldInput
                  field={field}
                  value={getFieldValueAsString(draft, field)}
                  disabled={readOnly}
                  invalid={fieldInvalid(plan, field)}
                  onChange={(v) => onChangeField(field, v)}
                />
              </label>
            ))}
          </fieldset>
        );
      })}
    </>
  );
}

export function TicketWorkbench({ ticketId }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(sateiQueries.ticket(ticketId));
  const [draft, setDraft] = React.useState<Ticket>(() => data.ticket);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [reportNote, setReportNote] = React.useState("");
  const [reportReason, setReportReason] =
    React.useState<SuspiciousReasonCode>("other");

  React.useEffect(() => {
    setDraft(data.ticket);
  }, [
    data.ticket.id,
    data.ticket.updatedAt,
    data.ticket.ruleSetVersion,
    data.ticket.status,
  ]);

  const readOnly =
    actor.role === "viewer" || data.ticket.status !== "open";

  // Live FormPlan from pinned RuleSet (same evaluate as server accept).
  const plan = React.useMemo(
    () =>
      evaluate(draft, data.pinnedRuleSet, {
        activeRuleSetVersion: data.plan.computed.activeRuleSetVersion,
      }),
    [draft, data.pinnedRuleSet, data.plan.computed.activeRuleSetVersion],
  );

  const saveMut = useMutation({
    mutationFn: async (ticket: Ticket) => {
      return patchTicketFn({
        data: {
          id: ticket.id,
          channel: ticket.channel,
          paymentMethod: ticket.paymentMethod,
          seller: ticket.seller,
          idCheck: ticket.idCheck,
          aml: ticket.aml,
          authenticity: ticket.authenticity,
          lines: ticket.lines.map((l) => ({
            id: l.id,
            category: l.category,
            offerAmount: l.offerAmount,
            attrs: l.attrs as Record<string, string | number | boolean>,
          })),
        },
      });
    },
    onSuccess: async (result) => {
      if (result.ok) {
        setMsg("保存しました");
        setDraft(result.value.ticket);
        qc.setQueryData(sateiQueries.ticket(ticketId).queryKey, result.value);
        await qc.invalidateQueries({ queryKey: ["satei", "tickets"] });
      } else {
        setMsg(`${result.code}: ${result.message}`);
      }
    },
  });

  const acceptMut = useMutation({
    mutationFn: async () => {
      const saved = await saveMut.mutateAsync(draft);
      if (!saved.ok) return saved;
      return acceptTicketFn({ data: { id: ticketId } });
    },
    onSuccess: async (result) => {
      if (result.ok) {
        setMsg("成約しました（台帳投影）");
        await qc.invalidateQueries({ queryKey: ["satei"] });
      } else {
        const blocks =
          "blocks" in result && result.blocks
            ? result.blocks.map((b) => b.message).join("; ")
            : result.message;
        setMsg(`成約拒否: ${blocks}`);
        await qc.invalidateQueries({ queryKey: ["satei", "ticket", ticketId] });
      }
    },
  });

  const repinMut = useMutation({
    mutationFn: () => repinRuleSetFn({ data: { id: ticketId } }),
    onSuccess: async (result) => {
      if (result.ok) {
        setMsg(`repin → v${result.value.ticket.ruleSetVersion}`);
        await qc.invalidateQueries({ queryKey: ["satei"] });
      } else {
        setMsg(`${result.code}: ${result.message}`);
      }
    },
  });

  const reportMut = useMutation({
    mutationFn: () =>
      reportSuspiciousFn({
        data: {
          ticketId,
          reasonCode: reportReason,
          note: reportNote,
        },
      }),
    onSuccess: async (result) => {
      if (result.ok) {
        setMsg("不正品申告を記録しました (stub)");
        setReportNote("");
        await qc.invalidateQueries({ queryKey: ["satei"] });
      } else {
        setMsg(`${result.code}: ${result.message}`);
      }
    },
  });

  const catalog = data.pinnedRuleSet.layers.catalog;

  return (
    <section className="space-y-4" data-testid="ticket-workbench">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to="/tickets"
            className="text-sm text-blue-700 underline dark:text-blue-300"
          >
            ← 一覧
          </Link>
          <h2 className="font-mono text-lg font-semibold">{ticketId}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            status={data.ticket.status} · pin=v{draft.ruleSetVersion}
            {plan.computed.pinStale && (
              <span className="ml-2 text-amber-700 dark:text-amber-400">
                (active=v{plan.computed.activeRuleSetVersion} と不一致)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.computed.pinStale && !readOnly && (
            <button
              type="button"
              data-testid="repin"
              className="rounded border border-amber-600 px-2 py-1 text-sm text-amber-800 dark:text-amber-300"
              onClick={() => repinMut.mutate()}
            >
              現行ルールへ repin
            </button>
          )}
          <button
            type="button"
            data-testid="save-ticket"
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700"
            disabled={readOnly || saveMut.isPending}
            onClick={() => saveMut.mutate(draft)}
          >
            保存
          </button>
          <button
            type="button"
            data-testid="accept-ticket"
            className="rounded bg-green-700 px-2 py-1 text-sm text-white disabled:opacity-50"
            disabled={readOnly || acceptMut.isPending}
            title={
              plan.computed.ledgerReady
                ? "成約（server も同一 evaluate）"
                : "ledgerReady=false — 押すと server が拒否を返す"
            }
            onClick={() => acceptMut.mutate()}
          >
            成約 (accept)
          </button>
        </div>
      </div>

      <div
        className="grid gap-2 rounded border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2"
        data-testid="computed-panel"
      >
        <div data-testid="total-amount">
          totalAmount: {plan.computed.totalAmount}
        </div>
        <div data-testid="need-identity">
          needIdentity: {String(plan.computed.needIdentity)}
        </div>
        <div data-testid="need-aml">
          needAml: {String(plan.computed.needAml)}
        </div>
        <div data-testid="ledger-ready">
          ledgerReady: {String(plan.computed.ledgerReady)}
        </div>
        <div data-testid="buyable">
          buyable: {String(plan.computed.buyable)}
        </div>
        <div className="text-xs text-gray-500">
          RuleSet pin v{draft.ruleSetVersion} · catalog categories:{" "}
          {Object.keys(catalog.categories).length}
        </div>
      </div>

      {plan.blocks.length > 0 && (
        <ul
          className="list-disc space-y-1 rounded border border-red-200 bg-red-50 px-5 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          data-testid="blocks"
        >
          {plan.blocks.map((b) => (
            <li key={b.code + b.message}>
              <code>{b.code}</code>: {b.message}
            </li>
          ))}
        </ul>
      )}

      {msg && (
        <p className="text-sm" data-testid="flash-msg">
          {msg}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>明細追加:</span>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`add-line-${c}`}
              className="rounded border border-gray-300 px-2 py-0.5 dark:border-gray-700"
              onClick={() => setDraft((d) => addLine(d, c as Category))}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      <PlanFields
        plan={plan}
        draft={draft}
        readOnly={readOnly}
        onChangeField={(field, v) =>
          setDraft((d) => setFieldValue(d, field, v))
        }
        onRemoveLine={(lineId) => setDraft((d) => removeLine(d, lineId))}
      />

      <fieldset
        className="space-y-2 rounded border border-orange-200 p-3 dark:border-orange-900"
        data-testid="suspicious-panel"
      >
        <legend className="px-1 text-sm font-semibold">不正品申告 (stub)</legend>
        <p className="text-xs text-gray-500">
          警察 API なし。SoR に記録するのみ。accept と直交。
        </p>
        <select
          data-testid="report-reason"
          className="w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
          value={reportReason}
          disabled={actor.role === "viewer"}
          onChange={(e) =>
            setReportReason(e.target.value as SuspiciousReasonCode)
          }
        >
          <option value="suspected_stolen">盗品疑い</option>
          <option value="serial_tamper">シリアル改ざん疑い</option>
          <option value="other">その他</option>
        </select>
        <textarea
          data-testid="report-note"
          className="w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
          rows={2}
          placeholder="5文字以上"
          value={reportNote}
          disabled={actor.role === "viewer"}
          onChange={(e) => setReportNote(e.target.value)}
        />
        <button
          type="button"
          data-testid="report-suspicious"
          className="rounded bg-orange-700 px-2 py-1 text-sm text-white disabled:opacity-50"
          disabled={actor.role === "viewer" || reportMut.isPending}
          onClick={() => reportMut.mutate()}
        >
          申告を記録
        </button>
        {data.reports.length > 0 && (
          <ul className="text-xs">
            {data.reports.map((r) => (
              <li key={r.id}>
                {r.id}: {r.reasonCode} — {r.note}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {data.ledger && (
        <div
          className="rounded border border-green-300 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950"
          data-testid="ledger-entry"
        >
          <h3 className="font-semibold">台帳投影 {data.ledger.id}</h3>
          <pre className="mt-1 overflow-x-auto text-xs">
            {JSON.stringify(data.ledger, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
