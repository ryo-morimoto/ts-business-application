"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  goNextAction,
  saveDraftAction,
  submitDraftAction,
} from "@/app/actions/drafts";
import {
  STEP_ORDER,
  canOpenStep,
  submitSchema,
  type DraftView,
  type StepId,
} from "@/modules/drafting";
import type { FieldErrors } from "@/shared/http/result";

type Line = {
  sku: string;
  quantity: number;
  unitPrice?: number;
};

type FormValues = {
  title: string;
  vendorName: string;
  neededBy: string;
  note: string;
  lines: Line[];
};

function toFormValues(draft: DraftView): FormValues {
  return {
    title: draft.payload.title ?? "",
    vendorName: draft.payload.vendorName ?? "",
    neededBy: draft.payload.neededBy ?? "",
    note: draft.payload.note ?? "",
    lines:
      draft.payload.lines?.map((l) => ({
        sku: l.sku ?? "",
        quantity: l.quantity ?? 1,
        unitPrice: l.unitPrice,
      })) ?? [{ sku: "", quantity: 1 }],
  };
}

function toPatch(values: FormValues) {
  return {
    title: values.title,
    vendorName: values.vendorName,
    neededBy: values.neededBy || undefined,
    note: values.note,
    lines: values.lines.map((l) => ({
      sku: l.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
  };
}

type Props = {
  draft: DraftView;
  initialStep: StepId;
  canWrite: boolean;
};

const STEP_LABEL: Record<StepId, string> = {
  basics: "1. 基本情報",
  lines: "2. 明細",
  review: "3. 確認",
};

export function Wizard({ draft, initialStep, canWrite }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(() =>
    canOpenStep(draft.lastStepId, initialStep) ? initialStep : draft.lastStepId,
  );
  const [serverErrors, setServerErrors] = useState<FieldErrors | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastStepId, setLastStepId] = useState(draft.lastStepId);

  const defaultValues = useMemo(() => toFormValues(draft), [draft]);

  const form = useForm({
    defaultValues,
    onSubmit: async () => {
      /* mutations via buttons */
    },
  });

  function syncUrl(next: StepId) {
    const url = new URL(window.location.href);
    url.searchParams.set("step", next);
    router.replace(url.pathname + "?" + url.searchParams.toString());
    setStep(next);
  }

  function run(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  return (
    <div className="panel" data-testid="wizard">
      <ol className="steps" aria-label="wizard steps">
        {STEP_ORDER.map((s) => (
          <li
            key={s}
            className={
              s === step ? "current" : canOpenStep(lastStepId, s) ? "done" : ""
            }
            data-testid={`step-indicator-${s}`}
          >
            {canOpenStep(lastStepId, s) && s !== step ? (
              <button
                type="button"
                className="linkish"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                  cursor: "pointer",
                }}
                onClick={() => syncUrl(s)}
              >
                {STEP_LABEL[s]}
              </button>
            ) : (
              STEP_LABEL[s]
            )}
          </li>
        ))}
      </ol>

      {message ? (
        <div className="flash-ok" data-testid="wizard-message">
          {message}
        </div>
      ) : null}
      {serverErrors ? (
        <div className="flash-error" data-testid="wizard-errors">
          {Object.entries(serverErrors).map(([k, msgs]) => (
            <div key={k}>
              {k}: {msgs.join(", ")}
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {step === "basics" ? (
          <div data-testid="step-basics">
            <form.Field
              name="title"
              children={(field) => (
                <label className="field">
                  <span>件名 *</span>
                  <input
                    data-testid="field-title"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={!canWrite}
                  />
                </label>
              )}
            />
            <form.Field
              name="vendorName"
              children={(field) => (
                <label className="field">
                  <span>仕入先 *</span>
                  <input
                    data-testid="field-vendor"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={!canWrite}
                  />
                </label>
              )}
            />
            <form.Field
              name="neededBy"
              children={(field) => (
                <label className="field">
                  <span>希望日 (YYYY-MM-DD)</span>
                  <input
                    data-testid="field-needed-by"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={!canWrite}
                    placeholder="2026-08-01"
                  />
                </label>
              )}
            />
            <form.Field
              name="note"
              children={(field) => (
                <label className="field">
                  <span>メモ</span>
                  <textarea
                    data-testid="field-note"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={!canWrite}
                    rows={2}
                  />
                </label>
              )}
            />
          </div>
        ) : null}

        {step === "lines" ? (
          <div data-testid="step-lines">
            <form.Field
              name="lines"
              mode="array"
              children={(linesField) => (
                <div>
                  {linesField.state.value.map((_, i) => (
                    <div className="line-row" key={i}>
                      <form.Field
                        name={`lines[${i}].sku`}
                        children={(field) => (
                          <label className="field">
                            <span>SKU</span>
                            <input
                              data-testid={`field-line-sku-${i}`}
                              value={field.state.value as string}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              disabled={!canWrite}
                            />
                          </label>
                        )}
                      />
                      <form.Field
                        name={`lines[${i}].quantity`}
                        children={(field) => (
                          <label className="field">
                            <span>数量</span>
                            <input
                              type="number"
                              data-testid={`field-line-qty-${i}`}
                              value={field.state.value as number}
                              onChange={(e) =>
                                field.handleChange(Number(e.target.value))
                              }
                              disabled={!canWrite}
                              min={1}
                            />
                          </label>
                        )}
                      />
                      <form.Field
                        name={`lines[${i}].unitPrice`}
                        children={(field) => (
                          <label className="field">
                            <span>単価</span>
                            <input
                              type="number"
                              data-testid={`field-line-price-${i}`}
                              value={(field.state.value as number | undefined) ?? ""}
                              onChange={(e) =>
                                field.handleChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                                )
                              }
                              disabled={!canWrite}
                              min={0}
                            />
                          </label>
                        )}
                      />
                      {canWrite ? (
                        <button
                          type="button"
                          data-testid={`remove-line-${i}`}
                          onClick={() => linesField.removeValue(i)}
                          disabled={linesField.state.value.length <= 1}
                        >
                          削除
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {canWrite ? (
                    <button
                      type="button"
                      data-testid="add-line"
                      onClick={() =>
                        linesField.pushValue({ sku: "", quantity: 1 })
                      }
                    >
                      行を追加
                    </button>
                  ) : null}
                </div>
              )}
            />
          </div>
        ) : null}

        {step === "review" ? (
          <div data-testid="step-review">
            <form.Subscribe
              selector={(s) => s.values}
              children={(values) => {
                const parsed = submitSchema.safeParse({
                  title: values.title,
                  vendorName: values.vendorName,
                  neededBy: values.neededBy || undefined,
                  note: values.note,
                  lines: values.lines,
                });
                const missing = parsed.success
                  ? []
                  : [
                      ...new Set(
                        parsed.error.issues.map((i) =>
                          i.path.map(String).join("."),
                        ),
                      ),
                    ];
                return (
                  <div>
                    <p>
                      <strong>件名:</strong> {values.title || "—"}
                    </p>
                    <p>
                      <strong>仕入先:</strong> {values.vendorName || "—"}
                    </p>
                    <p>
                      <strong>希望日:</strong> {values.neededBy || "—"}
                    </p>
                    <p>
                      <strong>メモ:</strong> {values.note || "—"}
                    </p>
                    <h3>明細</h3>
                    <ul>
                      {values.lines.map((l, i) => (
                        <li key={i} data-testid={`review-line-${i}`}>
                          {l.sku || "?"} × {l.quantity}
                          {l.unitPrice != null ? ` @ ${l.unitPrice}` : ""}
                        </li>
                      ))}
                    </ul>
                    {missing.length > 0 ? (
                      <div>
                        <p className="muted">提出に不足している項目:</p>
                        <ul
                          className="missing-list"
                          data-testid="readiness-missing"
                        >
                          {missing.map((m) => (
                            <li key={m}>{m || "_form"}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="flash-ok" data-testid="readiness-ok">
                        提出可能な状態です
                      </p>
                    )}
                  </div>
                );
              }}
            />
          </div>
        ) : null}

        <div className="actions">
          {step !== "basics" ? (
            <button
              type="button"
              data-testid="wizard-back"
              onClick={() => {
                const i = STEP_ORDER.indexOf(step);
                const prev = STEP_ORDER[i - 1];
                if (prev) syncUrl(prev);
              }}
            >
              戻る
            </button>
          ) : null}

          {canWrite && step !== "review" ? (
            <button
              type="button"
              data-testid="wizard-save"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  setServerErrors(null);
                  setMessage(null);
                  const values = form.state.values;
                  const result = await saveDraftAction(
                    draft.id,
                    toPatch(values),
                  );
                  if (!result.ok) {
                    setServerErrors(
                      result.fieldErrors ?? { _form: [result.message] },
                    );
                    return;
                  }
                  setLastStepId(result.draft.lastStepId);
                  setMessage("保存しました");
                  form.reset(toFormValues(result.draft));
                })
              }
            >
              保存
            </button>
          ) : null}

          {canWrite && step !== "review" ? (
            <button
              type="button"
              className="primary"
              data-testid="wizard-next"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  setServerErrors(null);
                  setMessage(null);
                  const values = form.state.values;
                  const result = await goNextAction(
                    draft.id,
                    step,
                    toPatch(values),
                  );
                  if (!result.ok) {
                    setServerErrors(
                      result.fieldErrors ?? { _form: [result.message] },
                    );
                    return;
                  }
                  setLastStepId(result.draft.lastStepId);
                  form.reset(toFormValues(result.draft));
                  syncUrl(result.step);
                })
              }
            >
              次へ
            </button>
          ) : null}

          {canWrite && step === "review" ? (
            <button
              type="button"
              className="primary"
              data-testid="wizard-submit"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  setServerErrors(null);
                  setMessage(null);
                  const values = form.state.values;
                  const saved = await saveDraftAction(
                    draft.id,
                    toPatch(values),
                  );
                  if (!saved.ok) {
                    setServerErrors(
                      saved.fieldErrors ?? { _form: [saved.message] },
                    );
                    return;
                  }
                  form.reset(toFormValues(saved.draft));
                  const result = await submitDraftAction(draft.id);
                  if (result && !result.ok) {
                    setServerErrors(
                      result.fieldErrors ?? { _form: [result.message] },
                    );
                  }
                  // redirect on success (throws NEXT_REDIRECT)
                })
              }
            >
              提出する
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
