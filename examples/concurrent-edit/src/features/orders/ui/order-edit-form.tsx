import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useUpdateOrderMutation } from "../api/orders.mutations";
import {
  orderFormValuesSchema,
  type Order,
  type OrderFormValues,
} from "../model/schemas";
import { ConflictPanel } from "./conflict-panel";
import { canEdit, type Actor } from "~/shared/actor/actor";

type Props = {
  order: Order;
  actor: Actor;
  onOrderReplaced: (order: Order) => void;
};

function toFormValues(order: Order): OrderFormValues {
  return {
    customerName: order.customerName,
    note: order.note,
    lines: order.lines.map((line) => ({ ...line })),
  };
}

export function OrderEditForm({ order, actor, onOrderReplaced }: Props) {
  const editable = canEdit(actor);
  const updateMutation = useUpdateOrderMutation();
  const [expectedVersion, setExpectedVersion] = useState(order.version);
  const [conflict, setConflict] = useState<{
    yourExpected: number;
    current: Order;
    yours: OrderFormValues;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const form = useForm({
    defaultValues: toFormValues(order),
    validators: {
      onSubmit: orderFormValuesSchema,
    },
    onSubmit: async ({ value }) => {
      setStatusMessage(null);
      setConflict(null);

      const result = await updateMutation.mutateAsync({
        id: order.id,
        expectedVersion,
        customerName: value.customerName,
        note: value.note,
        lines: value.lines,
      });

      if (!result.ok) {
        if (result.code === "version_conflict") {
          setConflict({
            yourExpected: result.yourExpected,
            current: result.current,
            yours: value,
          });
          return;
        }
        if (result.code === "forbidden") {
          setStatusMessage("Forbidden: viewer cannot save.");
          return;
        }
        setStatusMessage("Order not found.");
        return;
      }

      setExpectedVersion(result.order.version);
      setConflict(null);
      setStatusMessage(`Saved as v${result.order.version}`);
      form.reset(toFormValues(result.order));
      onOrderReplaced(result.order);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded bg-gray-200 px-2 py-1 font-mono dark:bg-gray-800">
          baselined expectedVersion={" "}
          <strong data-testid="expected-version">{expectedVersion}</strong>
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          server snapshot v{order.version} · last by {order.updatedBy}
        </span>
      </div>

      {conflict ? (
        <ConflictPanel
          yourExpected={conflict.yourExpected}
          current={conflict.current}
          yours={conflict.yours}
          onReloadServer={() => {
            setExpectedVersion(conflict.current.version);
            form.reset(toFormValues(conflict.current));
            setConflict(null);
            onOrderReplaced(conflict.current);
            setStatusMessage("Loaded server version into the form.");
          }}
          onKeepMineRebase={() => {
            setExpectedVersion(conflict.current.version);
            setConflict(null);
            setStatusMessage(
              `Rebased expectedVersion to ${conflict.current.version}. Submit again to overwrite with your draft.`,
            );
          }}
        />
      ) : null}

      {statusMessage ? (
        <p className="text-sm text-green-800 dark:text-green-300" data-testid="status-message">
          {statusMessage}
        </p>
      ) : null}

      <form
        className="space-y-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="order-edit-form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <fieldset disabled={!editable} className="space-y-4">
          <form.Field
            name="customerName"
            children={(field) => (
              <label className="block text-sm">
                <span className="font-medium">Customer</span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-950"
                  data-testid="field-customer"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 ? (
                  <em className="text-red-600">{field.state.meta.errors.join(", ")}</em>
                ) : null}
              </label>
            )}
          />

          <form.Field
            name="note"
            children={(field) => (
              <label className="block text-sm">
                <span className="font-medium">Note</span>
                <textarea
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-950"
                  data-testid="field-note"
                  id={field.name}
                  name={field.name}
                  rows={2}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          />

          <form.Field
            name="lines"
            mode="array"
            children={(linesField) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Line items</h3>
                  {editable ? (
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      data-testid="add-line"
                      onClick={() =>
                        linesField.pushValue({
                          id: `ln_${crypto.randomUUID().slice(0, 8)}`,
                          sku: "",
                          description: "",
                          quantity: 1,
                          unitPrice: 0,
                        })
                      }
                    >
                      Add line
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {linesField.state.value.map((_, i) => (
                    <div
                      key={linesField.state.value[i]?.id ?? i}
                      className="grid gap-2 rounded border border-gray-100 p-3 dark:border-gray-800 md:grid-cols-12"
                      data-testid={`line-row-${i}`}
                    >
                      <form.Field
                        name={`lines[${i}].sku`}
                        children={(field) => (
                          <label className="block text-xs md:col-span-2">
                            SKU
                            <input
                              className="mt-1 w-full rounded border px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                              data-testid={`line-sku-${i}`}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                            />
                          </label>
                        )}
                      />
                      <form.Field
                        name={`lines[${i}].description`}
                        children={(field) => (
                          <label className="block text-xs md:col-span-4">
                            Description
                            <input
                              className="mt-1 w-full rounded border px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                            />
                          </label>
                        )}
                      />
                      <form.Field
                        name={`lines[${i}].quantity`}
                        children={(field) => (
                          <label className="block text-xs md:col-span-2">
                            Qty
                            <input
                              type="number"
                              className="mt-1 w-full rounded border px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                              data-testid={`line-qty-${i}`}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(Number(e.target.value))
                              }
                            />
                          </label>
                        )}
                      />
                      <form.Field
                        name={`lines[${i}].unitPrice`}
                        children={(field) => (
                          <label className="block text-xs md:col-span-2">
                            Unit price
                            <input
                              type="number"
                              step="0.01"
                              className="mt-1 w-full rounded border px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(Number(e.target.value))
                              }
                            />
                          </label>
                        )}
                      />
                      <div className="flex items-end md:col-span-2">
                        {editable ? (
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs text-red-700"
                            disabled={linesField.state.value.length <= 1}
                            onClick={() => linesField.removeValue(i)}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          />
        </fieldset>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              data-testid="save-order"
              disabled={!editable || !canSubmit || isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          )}
        />

        {!editable ? (
          <p className="text-sm text-gray-600" data-testid="read-only-hint">
            Viewer is read-only.
          </p>
        ) : null}
      </form>
    </div>
  );
}
