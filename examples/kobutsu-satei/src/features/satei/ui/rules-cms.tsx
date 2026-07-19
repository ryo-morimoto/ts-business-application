import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";
import {
  cloneRuleSetFn,
  discardRuleSetDraftFn,
  publishRuleSetFn,
  updateRuleSetDraftFn,
} from "../api/satei.functions";
import { sateiQueries } from "../api/satei.queries";
import {
  diffEditable,
  parseEditable,
  previewComplianceImpact,
} from "../model/editable";
import type {
  Category,
  EditableCompliance,
  RuleSet,
  RuleSetView,
} from "../model/types";
import { CATEGORIES } from "../model/types";
import { useActor } from "~/shared/actor/actor-context";

const col = createColumnHelper<RuleSet>();

function statusClass(status: RuleSet["status"]): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200";
    case "draft":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case "retired":
      return "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400";
  }
}

function emptyForm(base: EditableCompliance): EditableCompliance {
  return structuredClone(base);
}

export function RulesCms() {
  const { actor } = useActor();
  const qc = useQueryClient();
  const { data: ruleSets } = useSuspenseQuery(sateiQueries.ruleSets());
  const canEdit = actor.role === "compliance";

  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(
    () => ruleSets.find((r) => r.status === "active")?.version ?? null,
  );
  const [form, setForm] = React.useState<EditableCompliance | null>(null);
  const [label, setLabel] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<string, string>>
  >({});

  // Only repair selection when the chosen version disappeared (e.g. discard).
  // Do NOT race with clone: wait until the new version is in `ruleSets` first.
  React.useEffect(() => {
    if (ruleSets.length === 0) {
      setSelectedVersion(null);
      return;
    }
    if (
      selectedVersion != null &&
      ruleSets.some((r) => r.version === selectedVersion)
    ) {
      return;
    }
    const active = ruleSets.find((r) => r.status === "active");
    setSelectedVersion(active?.version ?? ruleSets[0]?.version ?? null);
  }, [ruleSets, selectedVersion]);

  const detailQ = useQuery({
    ...sateiQueries.ruleSet(selectedVersion ?? 0),
    enabled: selectedVersion != null,
  });

  const view: RuleSetView | undefined = detailQ.data;
  const selected = view?.ruleSet;
  const isDraft = selected?.status === "draft";
  const editing = canEdit && isDraft;

  // Hydrate form when selecting a draft (or after server refresh of same draft)
  React.useEffect(() => {
    if (!selected) {
      setForm(null);
      setLabel("");
      return;
    }
    if (selected.status === "draft") {
      setForm(emptyForm(selected.editable));
      setLabel(selected.label);
      setFieldErrors({});
    } else {
      setForm(null);
      setLabel(selected.label);
      setFieldErrors({});
    }
  }, [selected?.version, selected?.updatedAt, selected?.status]);

  const dirty = React.useMemo(() => {
    if (!selected || !form || selected.status !== "draft") return false;
    const labelDirty = label !== selected.label;
    const diffs = diffEditable(selected.editable, form);
    return labelDirty || diffs.length > 0;
  }, [selected, form, label]);

  const liveImpact = React.useMemo(() => {
    if (form) return previewComplianceImpact(form);
    if (selected) return previewComplianceImpact(selected.editable);
    return [];
  }, [form, selected]);

  const liveDiffs = React.useMemo(() => {
    if (!view?.parent) return view?.diffs ?? [];
    if (form && selected?.status === "draft") {
      return diffEditable(view.parent.editable, form);
    }
    return view.diffs;
  }, [view, form, selected?.status]);

  const invalidateRules = async () => {
    await qc.invalidateQueries({ queryKey: ["satei", "rulesets"] });
    await qc.invalidateQueries({ queryKey: ["satei", "ruleset"] });
    // Tickets may show pinStale after publish
    await qc.invalidateQueries({ queryKey: ["satei", "tickets"] });
    await qc.invalidateQueries({ queryKey: ["satei", "ticket"] });
  };

  const cloneMut = useMutation({
    mutationFn: async (sourceVersion?: number) => {
      const result = await cloneRuleSetFn({
        data: sourceVersion != null ? { sourceVersion } : {},
      });
      if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
      return result.value;
    },
    onSuccess: async (v) => {
      // Seed caches first so selection effect cannot bounce back to active.
      qc.setQueryData(sateiQueries.ruleSet(v.ruleSet.version).queryKey, v);
      qc.setQueryData(sateiQueries.ruleSets().queryKey, (prev: RuleSet[] | undefined) => {
        const rest = (prev ?? []).filter((r) => r.version !== v.ruleSet.version);
        return [v.ruleSet, ...rest].sort((a, b) => b.version - a.version);
      });
      setSelectedVersion(v.ruleSet.version);
      setMsg(
        `draft v${v.ruleSet.version} を作成 (from v${v.ruleSet.parentVersion})`,
      );
      await invalidateRules();
    },
    onError: (e) => {
      setMsg(e instanceof Error ? e.message : "clone failed");
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selected || !form) throw new Error("no draft");
      const parsed = parseEditable(form);
      if (!parsed.ok) {
        setFieldErrors(parsed.fieldErrors);
        throw new Error("入力を修正してください");
      }
      setFieldErrors({});
      const result = await updateRuleSetDraftFn({
        data: {
          version: selected.version,
          editable: parsed.value,
          label,
        },
      });
      if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
      return result.value;
    },
    onSuccess: async (v) => {
      setMsg(`draft v${v.ruleSet.version} を保存しました`);
      qc.setQueryData(sateiQueries.ruleSet(v.ruleSet.version).queryKey, v);
      await invalidateRules();
    },
    onError: (e) => {
      setMsg(e instanceof Error ? e.message : "save failed");
    },
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("no selection");
      if (form) {
        const parsed = parseEditable(form);
        if (!parsed.ok) {
          setFieldErrors(parsed.fieldErrors);
          throw new Error("publish 前に入力を修正してください");
        }
        const saved = await updateRuleSetDraftFn({
          data: {
            version: selected.version,
            editable: parsed.value,
            label,
          },
        });
        if (!saved.ok) throw new Error(`${saved.code}: ${saved.message}`);
      }
      const result = await publishRuleSetFn({
        data: { version: selected.version },
      });
      if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
      return result.value;
    },
    onSuccess: async (v) => {
      setMsg(`publish v${v.ruleSet.version} → active（旧 active は retired）`);
      setSelectedVersion(v.ruleSet.version);
      await invalidateRules();
    },
    onError: (e) => {
      setMsg(e instanceof Error ? e.message : "publish failed");
    },
  });

  const discardMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("no selection");
      const result = await discardRuleSetDraftFn({
        data: { version: selected.version },
      });
      if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
      return result.value;
    },
    onSuccess: async (v) => {
      setMsg(`draft v${v.discarded} を破棄しました`);
      setSelectedVersion(
        ruleSets.find((r) => r.status === "active")?.version ?? null,
      );
      await invalidateRules();
    },
    onError: (e) => {
      setMsg(e instanceof Error ? e.message : "discard failed");
    },
  });

  function toggleCategory(c: Category) {
    if (!form) return;
    const set = new Set(form.alwaysIdCategories);
    if (set.has(c)) set.delete(c);
    else set.add(c);
    setForm({ ...form, alwaysIdCategories: [...set] as Category[] });
  }

  const table = useReactTable({
    data: ruleSets,
    columns: [
      col.accessor("version", {
        header: "Ver",
        cell: (i) => (
          <button
            type="button"
            className="font-mono text-blue-700 underline dark:text-blue-300"
            data-testid={`select-ruleset-${i.getValue()}`}
            onClick={() => setSelectedVersion(i.getValue())}
          >
            v{i.getValue()}
          </button>
        ),
      }),
      col.accessor("status", {
        header: "Status",
        cell: (i) => (
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusClass(i.getValue())}`}
          >
            {i.getValue()}
          </span>
        ),
      }),
      col.accessor("label", {
        header: "Label",
        cell: (i) => (
          <span className="text-xs">{i.getValue() || "—"}</span>
        ),
      }),
      col.accessor((r) => r.editable.identityThresholdYen, {
        id: "threshold",
        header: "ID閾値",
      }),
      col.accessor((r) => r.editable.alwaysIdCategories.join(","), {
        id: "alwaysId",
        header: "alwaysId",
        cell: (i) => (
          <span className="font-mono text-xs">{i.getValue() || "—"}</span>
        ),
      }),
      col.accessor((r) => r.editable.forceIdentityAll, {
        id: "force",
        header: "forceAll",
        cell: (i) => String(i.getValue()),
      }),
      col.accessor((r) => r.editable.amlCashThresholdYen, {
        id: "aml",
        header: "AML閾値",
      }),
      col.accessor("parentVersion", {
        header: "parent",
        cell: (i) =>
          i.getValue() == null ? "—" : `v${i.getValue() as number}`,
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-4" data-testid="rules-cms">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">ルール CMS (M)</h2>
          <p className="text-xs text-gray-500">
            clone → 構造化キー編集 → publish。catalog / appraisal の field defs は
            seed 固定（非編集）。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="clone-ruleset"
            className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={!canEdit || cloneMut.isPending}
            onClick={() => cloneMut.mutate(undefined)}
          >
            active を clone
          </button>
          {selected && selected.status !== "draft" && canEdit && (
            <button
              type="button"
              data-testid="clone-from-selected"
              className="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
              disabled={cloneMut.isPending}
              onClick={() => cloneMut.mutate(selected.version)}
            >
              選択版を clone
            </button>
          )}
        </div>
      </div>

      {!canEdit && (
        <p className="text-sm text-amber-800 dark:text-amber-300">
          閲覧モード（compliance のみ編集可）。actor を切り替えてください。
        </p>
      )}

      {msg && (
        <p className="text-sm" data-testid="cms-flash">
          {msg}
        </p>
      )}

      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
        <table className="min-w-full text-left text-sm" data-testid="ruleset-table">
          <thead className="bg-gray-100 dark:bg-gray-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-2 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const activeRow =
                selectedVersion === row.original.version
                  ? "bg-blue-50 dark:bg-blue-950/40"
                  : "";
              return (
                <tr
                  key={row.id}
                  className={`border-t border-gray-100 dark:border-gray-800 ${activeRow}`}
                  data-testid={`ruleset-row-${row.original.version}`}
                  data-status={row.original.status}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailQ.isLoading && (
        <p className="text-sm text-gray-500">RuleSet を読み込み中…</p>
      )}
      {detailQ.isError && (
        <p className="text-sm text-red-600">詳細の取得に失敗しました</p>
      )}

      {view && selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <fieldset
            className="space-y-3 rounded border border-gray-200 p-3 dark:border-gray-800"
            data-testid="ruleset-editor"
          >
            <legend className="px-1 font-semibold">
              v{selected.version}{" "}
              <span
                className={`ml-1 rounded px-1.5 py-0.5 text-xs ${statusClass(selected.status)}`}
              >
                {selected.status}
              </span>
              {dirty && (
                <span className="ml-2 text-xs text-amber-700" data-testid="dirty-badge">
                  未保存
                </span>
              )}
            </legend>

            <p className="text-xs text-gray-500">
              parent:{" "}
              {selected.parentVersion == null
                ? "—"
                : `v${selected.parentVersion}`}{" "}
              · open tickets on this version:{" "}
              <span data-testid="open-on-version">
                {view.openTicketsOnThisVersion}
              </span>
              {selected.publishedAt && (
                <>
                  {" "}
                  · published: {selected.publishedAt.slice(0, 19)}
                </>
              )}
            </p>

            <label className="block text-sm">
              label
              <input
                data-testid="edit-label"
                type="text"
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                value={editing ? label : selected.label}
                disabled={!editing}
                maxLength={80}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>

            {(() => {
              const ed = form ?? selected.editable;
              const disabled = !editing;
              return (
                <>
                  <label className="block text-sm">
                    identityThresholdYen（本人確認が必要になる対価総額）
                    <input
                      data-testid="edit-threshold"
                      type="number"
                      step={1}
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                      value={ed.identityThresholdYen}
                      disabled={disabled}
                      onChange={(e) =>
                        form &&
                        setForm({
                          ...form,
                          identityThresholdYen: Number(e.target.value),
                        })
                      }
                    />
                    {fieldErrors.identityThresholdYen && (
                      <span className="text-xs text-red-600">
                        {fieldErrors.identityThresholdYen}
                      </span>
                    )}
                  </label>

                  <label className="block text-sm">
                    amlCashThresholdYen（犯収法デモ: 現金×宝飾）
                    <input
                      data-testid="edit-aml-threshold"
                      type="number"
                      step={1}
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                      value={ed.amlCashThresholdYen}
                      disabled={disabled}
                      onChange={(e) =>
                        form &&
                        setForm({
                          ...form,
                          amlCashThresholdYen: Number(e.target.value),
                        })
                      }
                    />
                    {fieldErrors.amlCashThresholdYen && (
                      <span className="text-xs text-red-600">
                        {fieldErrors.amlCashThresholdYen}
                      </span>
                    )}
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      data-testid="edit-force-all"
                      type="checkbox"
                      checked={ed.forceIdentityAll}
                      disabled={disabled}
                      onChange={(e) =>
                        form &&
                        setForm({
                          ...form,
                          forceIdentityAll: e.target.checked,
                        })
                      }
                    />
                    forceIdentityAll（社内上乗せ・全件 ID）
                  </label>

                  <div className="text-sm">
                    <p className="mb-1">alwaysIdCategories（金額無関係に ID）</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <label
                          key={c}
                          className="flex items-center gap-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            data-testid={`edit-always-${c}`}
                            checked={ed.alwaysIdCategories.includes(c)}
                            disabled={disabled}
                            onChange={() => toggleCategory(c)}
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                    {fieldErrors.alwaysIdCategories && (
                      <span className="text-xs text-red-600">
                        {fieldErrors.alwaysIdCategories}
                      </span>
                    )}
                  </div>
                </>
              );
            })()}

            {editing && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  data-testid="save-draft"
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 disabled:opacity-50"
                  disabled={!dirty || saveMut.isPending}
                  onClick={() => saveMut.mutate()}
                >
                  draft 保存
                </button>
                <button
                  type="button"
                  data-testid="publish-ruleset"
                  className="rounded bg-green-700 px-2 py-1 text-sm text-white disabled:opacity-50"
                  disabled={publishMut.isPending}
                  onClick={() => publishMut.mutate()}
                >
                  publish (active 化)
                </button>
                <button
                  type="button"
                  data-testid="discard-draft"
                  className="rounded border border-red-300 px-2 py-1 text-sm text-red-700 dark:border-red-800"
                  disabled={discardMut.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `draft v${selected.version} を破棄しますか？`,
                      )
                    ) {
                      discardMut.mutate();
                    }
                  }}
                >
                  draft 破棄
                </button>
              </div>
            )}
          </fieldset>

          <div className="space-y-3">
            <div
              className="rounded border border-gray-200 p-3 dark:border-gray-800"
              data-testid="ruleset-diff"
            >
              <h3 className="mb-2 text-sm font-semibold">
                parent との差分 (editable)
              </h3>
              {liveDiffs.length === 0 ? (
                <p className="text-xs text-gray-500">差分なし / parent なし</p>
              ) : (
                <ul className="space-y-1 text-xs font-mono">
                  {liveDiffs.map((d) => (
                    <li key={d.key} data-testid={`diff-${d.key}`}>
                      <span className="text-gray-500">{d.key}</span>: {d.from}{" "}
                      → <strong>{d.to}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className="rounded border border-gray-200 p-3 dark:border-gray-800"
              data-testid="ruleset-layers"
            >
              <h3 className="mb-2 text-sm font-semibold">
                固定レイヤ (catalog / appraisal)
              </h3>
              <p className="mb-2 text-[11px] text-gray-500">
                pin 時に RuleSet へ複製。CMS M では編集しない。
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-medium">catalog categories</p>
                  <ul className="list-disc pl-4">
                    {Object.entries(selected.layers.catalog.categories).map(
                      ([id, def]) => (
                        <li key={id}>
                          <code>{id}</code> — {def.label} · fields=
                          {def.fields.length}
                          {def.requiresAuthenticity ? " · auth" : ""}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">
                    appraisal rules ({selected.layers.appraisal.length})
                  </p>
                  <ul className="list-disc pl-4 font-mono">
                    {selected.layers.appraisal.map((r) => (
                      <li key={r.code + r.type}>
                        {r.type} · {r.code}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div
              className="rounded border border-gray-200 p-3 dark:border-gray-800"
              data-testid="ruleset-impact"
            >
              <h3 className="mb-2 text-sm font-semibold">
                シナリオ影響プレビュー
              </h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="py-1 pr-2">シナリオ</th>
                    <th className="py-1 pr-2">needIdentity</th>
                    <th className="py-1">needAml</th>
                  </tr>
                </thead>
                <tbody>
                  {liveImpact.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 dark:border-gray-900"
                      data-testid={`impact-${s.id}`}
                    >
                      <td className="py-1 pr-2">{s.label}</td>
                      <td
                        className="py-1 pr-2"
                        data-testid={`impact-${s.id}-identity`}
                      >
                        {String(s.needIdentity)}
                      </td>
                      <td
                        className="py-1"
                        data-testid={`impact-${s.id}-aml`}
                      >
                        {String(s.needAml)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-gray-500">
                プレビューは CMS キーのみ反映。catalog/appraisal は seed 固定。
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
