import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Button,
  ErrorSummary,
  Field,
  PageHeader,
  Section,
  SelectField,
  TextAreaField,
  type ErrorSummaryItem,
} from "~/design-system";
import {
  createAccountFn,
  updateAccountFn,
} from "../api/accounts.functions";
import {
  accountDetailQuery,
  parentsQuery,
} from "../api/accounts.queries";
import {
  accountWriteSchema,
  type AccountWriteInput,
} from "../model/schemas";
import type { AccountsSearch } from "../model/list-search";
import { OWNERS, type Account } from "../model/types";
import { useActor } from "~/shared/actor/actor-context";
import { EmptyState } from "~/design-system";

function emptyWrite(): AccountWriteInput {
  return {
    code: "",
    legalName: "",
    status: "prospect",
    creditHold: false,
    tradeSuspended: false,
    ownerId: "alice",
    parentAccountId: "",
    segment: "smb",
    tags: [],
    countryCode: "JP",
    currency: "JPY",
    creditLimit: 0,
    paymentTermsDays: 30,
    addresses: [
      {
        role: "hq",
        isDefaultForRole: true,
        line1: "",
        countryCode: "JP",
      },
    ],
    contacts: [],
  };
}

function fromAccount(a: Account): AccountWriteInput {
  return {
    code: a.code,
    legalName: a.legalName,
    nameKana: a.nameKana,
    tradeName: a.tradeName,
    status: a.status,
    statusReason: a.statusReason,
    creditHold: a.creditHold,
    creditHoldReason: a.creditHoldReason,
    tradeSuspended: a.tradeSuspended,
    tradeSuspendReason: a.tradeSuspendReason,
    ownerId: a.ownerId,
    parentAccountId: a.parentAccountId ?? "",
    segment: a.segment,
    tags: a.tags,
    industry: a.industry,
    countryCode: a.countryCode,
    timezone: a.timezone,
    taxId: a.taxId,
    currency: a.currency,
    creditLimit: a.creditLimit,
    paymentTermsDays: a.paymentTermsDays,
    invoiceEmail: a.invoiceEmail ?? "",
    alertNote: a.alertNote,
    internalMemo: a.internalMemo,
    addresses: a.addresses.map((x) => ({ ...x })),
    contacts: a.contacts.map((x) => ({
      ...x,
      email: x.email ?? "",
    })),
  };
}

function flattenErrors(
  fieldErrors: { path: string; message: string }[],
): ErrorSummaryItem[] {
  return fieldErrors.map((e) => ({
    id: fieldPathToId(e.path),
    message: e.message,
  }));
}

function fieldPathToId(path: string): string {
  if (!path || path === "form") return "form-root";
  return `field-${path.replace(/\./g, "-")}`;
}

export function AccountCreateForm({
  listSearch,
}: {
  listSearch: AccountsSearch;
}) {
  const { actor } = useActor();
  if (actor.role === "viewer") {
    return <EmptyState kind="forbidden" />;
  }
  return (
    <AccountFormInner mode="create" listSearch={listSearch} initial={emptyWrite()} />
  );
}

export function AccountEditForm({
  accountId,
  listSearch,
}: {
  accountId: string;
  listSearch: AccountsSearch;
}) {
  const { actor } = useActor();
  const { data } = useSuspenseQuery(accountDetailQuery(accountId));
  if (actor.role === "viewer") {
    return <EmptyState kind="forbidden" />;
  }
  return (
    <AccountFormInner
      mode="edit"
      accountId={accountId}
      listSearch={listSearch}
      initial={fromAccount(data.account)}
    />
  );
}

function AccountFormInner({
  mode,
  accountId,
  listSearch,
  initial,
}: {
  mode: "create" | "edit";
  accountId?: string;
  listSearch: AccountsSearch;
  initial: AccountWriteInput;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: parents } = useSuspenseQuery(parentsQuery());
  const [values, setValues] = useState<AccountWriteInput>(initial);
  const [dirty, setDirty] = useState(false);
  const [summary, setSummary] = useState<ErrorSummaryItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: AccountWriteInput) => {
      if (mode === "create") {
        return createAccountFn({ data: { payload } });
      }
      return updateAccountFn({ data: { id: accountId!, payload } });
    },
  });

  function setField<K extends keyof AccountWriteInput>(
    key: K,
    value: AccountWriteInput[K],
  ) {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: value }));
  }

  function err(path: string): string | undefined {
    return fieldErrors[path];
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSummary([]);
    setFieldErrors({});

    const client = accountWriteSchema.safeParse(values);
    if (!client.success) {
      const fe = client.error.issues.map((i) => ({
        path: i.path.join(".") || "form",
        message: i.message,
      }));
      setSummary(flattenErrors(fe));
      setFieldErrors(Object.fromEntries(fe.map((x) => [x.path, x.message])));
      setSaving(false);
      document.querySelector<HTMLElement>("[data-testid=error-summary]")?.focus();
      return;
    }

    const result = await mutation.mutateAsync(client.data);
    setSaving(false);
    if (!result.ok) {
      const fe = result.fieldErrors ?? [
        { path: "form", message: result.message },
      ];
      setSummary(flattenErrors(fe));
      setFieldErrors(Object.fromEntries(fe.map((x) => [x.path, x.message])));
      document.querySelector<HTMLElement>("[data-testid=error-summary]")?.focus();
      return;
    }

    await qc.invalidateQueries({ queryKey: ["accounts"] });
    setDirty(false);
    void navigate({
      to: "/accounts/$accountId",
      params: { accountId: result.account.id },
      search: listSearch,
    });
  }

  function onCancel() {
    if (dirty && !confirm("未保存の変更があります。破棄しますか？")) return;
    if (mode === "edit" && accountId) {
      void navigate({
        to: "/accounts/$accountId",
        params: { accountId },
        search: listSearch,
      });
    } else {
      void navigate({ to: "/accounts", search: listSearch });
    }
  }

  const tagsText = useMemo(() => values.tags.join(", "), [values.tags]);

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <PageHeader
        eyebrow={mode === "create" ? "新規" : values.code}
        title={mode === "create" ? "取引先の登録" : "取引先の編集"}
        description="詳細と同じセクション順。modal に詰めない。"
        meta={
          dirty ? (
            <span className="text-xs font-semibold text-desk-warning">
              未保存の変更あり
            </span>
          ) : (
            <span className="text-xs text-desk-muted">保存済み状態</span>
          )
        }
        actions={
          <>
            <Button type="button" variant="secondary" onClick={onCancel}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </>
        }
      />

      <ErrorSummary errors={summary} />

      <Section id="section-basics" title="基本">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id={fieldPathToId("code")}
            label="取引先コード"
            required
            value={values.code}
            disabled={mode === "edit"}
            hint={mode === "edit" ? "作成後は変更できません" : "英大文字・数字・ハイフン"}
            error={err("code")}
            onChange={(e) => setField("code", e.target.value.toUpperCase())}
          />
          <Field
            id={fieldPathToId("legalName")}
            label="正式名称"
            required
            value={values.legalName}
            error={err("legalName")}
            onChange={(e) => setField("legalName", e.target.value)}
          />
          <Field
            id={fieldPathToId("tradeName")}
            label="略称・屋号"
            value={values.tradeName ?? ""}
            onChange={(e) => setField("tradeName", e.target.value)}
          />
          <Field
            id={fieldPathToId("nameKana")}
            label="カナ"
            value={values.nameKana ?? ""}
            onChange={(e) => setField("nameKana", e.target.value)}
          />
          <SelectField
            id={fieldPathToId("ownerId")}
            label="社内担当"
            required
            value={values.ownerId}
            error={err("ownerId")}
            onChange={(e) => setField("ownerId", e.target.value)}
          >
            {Object.entries(OWNERS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField
            id={fieldPathToId("parentAccountId")}
            label="親取引先"
            value={values.parentAccountId ?? ""}
            error={err("parentAccountId")}
            onChange={(e) => setField("parentAccountId", e.target.value)}
          >
            <option value="">（なし）</option>
            {parents
              .filter((p) => p.id !== accountId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
          </SelectField>
          <SelectField
            id={fieldPathToId("segment")}
            label="セグメント"
            value={values.segment}
            onChange={(e) =>
              setField("segment", e.target.value as AccountWriteInput["segment"])
            }
          >
            <option value="enterprise">enterprise</option>
            <option value="mid">mid</option>
            <option value="smb">smb</option>
            <option value="public">public</option>
          </SelectField>
          <Field
            id={fieldPathToId("tags")}
            label="タグ（カンマ区切り）"
            value={tagsText}
            onChange={(e) =>
              setField(
                "tags",
                e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .slice(0, 8),
              )
            }
          />
          <Field
            id={fieldPathToId("industry")}
            label="業種"
            value={values.industry ?? ""}
            onChange={(e) => setField("industry", e.target.value)}
          />
          <Field
            id={fieldPathToId("countryCode")}
            label="国コード"
            required
            value={values.countryCode}
            onChange={(e) => setField("countryCode", e.target.value.toUpperCase())}
          />
        </div>
      </Section>

      <Section id="section-commercial" title="商況・与信">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id={fieldPathToId("status")}
            label="ステータス"
            value={values.status}
            onChange={(e) =>
              setField("status", e.target.value as AccountWriteInput["status"])
            }
          >
            <option value="prospect">見込</option>
            <option value="active">稼働</option>
            <option value="suspended">停止</option>
          </SelectField>
          <Field
            id={fieldPathToId("statusReason")}
            label="停止理由"
            value={values.statusReason ?? ""}
            error={err("statusReason")}
            onChange={(e) => setField("statusReason", e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={values.creditHold}
              onChange={(e) => setField("creditHold", e.target.checked)}
            />
            与信停止
          </label>
          <Field
            id={fieldPathToId("creditHoldReason")}
            label="与信停止理由"
            value={values.creditHoldReason ?? ""}
            error={err("creditHoldReason")}
            onChange={(e) => setField("creditHoldReason", e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={values.tradeSuspended}
              onChange={(e) => setField("tradeSuspended", e.target.checked)}
            />
            出荷停止
          </label>
          <Field
            id={fieldPathToId("tradeSuspendReason")}
            label="出荷停止理由"
            value={values.tradeSuspendReason ?? ""}
            onChange={(e) => setField("tradeSuspendReason", e.target.value)}
          />
          <Field
            id={fieldPathToId("creditLimit")}
            label="与信限度"
            type="number"
            required
            value={String(values.creditLimit)}
            error={err("creditLimit")}
            onChange={(e) => setField("creditLimit", Number(e.target.value))}
          />
          <SelectField
            id={fieldPathToId("currency")}
            label="通貨"
            value={values.currency}
            onChange={(e) =>
              setField("currency", e.target.value as AccountWriteInput["currency"])
            }
          >
            <option value="JPY">JPY</option>
            <option value="USD">USD</option>
          </SelectField>
          <Field
            id={fieldPathToId("paymentTermsDays")}
            label="支払サイト（日）"
            type="number"
            value={String(values.paymentTermsDays)}
            error={err("paymentTermsDays")}
            onChange={(e) =>
              setField("paymentTermsDays", Number(e.target.value))
            }
          />
          <Field
            id={fieldPathToId("taxId")}
            label="法人番号"
            value={values.taxId ?? ""}
            onChange={(e) => setField("taxId", e.target.value)}
          />
          <Field
            id={fieldPathToId("invoiceEmail")}
            label="請求送付メール"
            type="email"
            value={values.invoiceEmail ?? ""}
            error={err("invoiceEmail")}
            onChange={(e) => setField("invoiceEmail", e.target.value)}
          />
        </div>
      </Section>

      <Section
        id="section-addresses"
        title="住所"
        description="表形式。card グリッドにしない。"
      >
        {err("addresses") ? (
          <p className="mb-2 text-xs text-desk-danger" id={fieldPathToId("addresses")}>
            {err("addresses")}
          </p>
        ) : null}
        <table className="ds-table">
          <thead>
            <tr>
              <th>役割</th>
              <th>default</th>
              <th>ラベル</th>
              <th>郵便番号</th>
              <th>都道府県</th>
              <th>住所1</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {values.addresses.map((ad, idx) => (
              <tr key={idx}>
                <td>
                  <select
                    className="border border-desk-border px-1 py-1 text-sm"
                    value={ad.role}
                    onChange={(e) => {
                      const addresses = [...values.addresses];
                      addresses[idx] = {
                        ...ad,
                        role: e.target.value as typeof ad.role,
                      };
                      setField("addresses", addresses);
                    }}
                  >
                    <option value="hq">本社</option>
                    <option value="bill_to">請求先</option>
                    <option value="ship_to">納品先</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={ad.isDefaultForRole}
                    onChange={(e) => {
                      const addresses = values.addresses.map((x, i) =>
                        i === idx
                          ? { ...x, isDefaultForRole: e.target.checked }
                          : x.role === ad.role && e.target.checked
                            ? { ...x, isDefaultForRole: false }
                            : x,
                      );
                      setField("addresses", addresses);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="w-24 border border-desk-border px-1 py-1 text-sm"
                    value={ad.label ?? ""}
                    onChange={(e) => {
                      const addresses = [...values.addresses];
                      addresses[idx] = { ...ad, label: e.target.value };
                      setField("addresses", addresses);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="w-24 border border-desk-border px-1 py-1 text-sm"
                    value={ad.postalCode ?? ""}
                    onChange={(e) => {
                      const addresses = [...values.addresses];
                      addresses[idx] = { ...ad, postalCode: e.target.value };
                      setField("addresses", addresses);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="w-24 border border-desk-border px-1 py-1 text-sm"
                    value={ad.prefecture ?? ""}
                    onChange={(e) => {
                      const addresses = [...values.addresses];
                      addresses[idx] = { ...ad, prefecture: e.target.value };
                      setField("addresses", addresses);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="min-w-40 border border-desk-border px-1 py-1 text-sm"
                    value={ad.line1}
                    onChange={(e) => {
                      const addresses = [...values.addresses];
                      addresses[idx] = { ...ad, line1: e.target.value };
                      setField("addresses", addresses);
                    }}
                  />
                </td>
                <td>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={values.addresses.length <= 1}
                    onClick={() =>
                      setField(
                        "addresses",
                        values.addresses.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    削除
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setField("addresses", [
                ...values.addresses,
                {
                  role: "ship_to",
                  isDefaultForRole: false,
                  line1: "",
                  countryCode: values.countryCode || "JP",
                },
              ])
            }
          >
            住所を追加
          </Button>
        </div>
      </Section>

      <Section id="section-contacts" title="担当">
        {err("contacts") ? (
          <p className="mb-2 text-xs text-desk-danger" id={fieldPathToId("contacts")}>
            {err("contacts")}
          </p>
        ) : null}
        <table className="ds-table">
          <thead>
            <tr>
              <th>代表</th>
              <th>役割</th>
              <th>氏名</th>
              <th>メール</th>
              <th>電話</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {values.contacts.map((c, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="checkbox"
                    checked={c.isPrimary}
                    onChange={(e) => {
                      const contacts = values.contacts.map((x, i) => ({
                        ...x,
                        isPrimary: i === idx ? e.target.checked : e.target.checked ? false : x.isPrimary,
                      }));
                      setField("contacts", contacts);
                    }}
                  />
                </td>
                <td>
                  <select
                    className="border border-desk-border px-1 py-1 text-sm"
                    value={c.role}
                    onChange={(e) => {
                      const contacts = [...values.contacts];
                      contacts[idx] = {
                        ...c,
                        role: e.target.value as typeof c.role,
                      };
                      setField("contacts", contacts);
                    }}
                  >
                    <option value="primary">主</option>
                    <option value="billing">請求</option>
                    <option value="operations">現場</option>
                    <option value="other">その他</option>
                  </select>
                </td>
                <td>
                  <input
                    className="border border-desk-border px-1 py-1 text-sm"
                    value={c.name}
                    onChange={(e) => {
                      const contacts = [...values.contacts];
                      contacts[idx] = { ...c, name: e.target.value };
                      setField("contacts", contacts);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="border border-desk-border px-1 py-1 text-sm"
                    value={c.email ?? ""}
                    onChange={(e) => {
                      const contacts = [...values.contacts];
                      contacts[idx] = { ...c, email: e.target.value };
                      setField("contacts", contacts);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="border border-desk-border px-1 py-1 text-sm"
                    value={c.phone ?? ""}
                    onChange={(e) => {
                      const contacts = [...values.contacts];
                      contacts[idx] = { ...c, phone: e.target.value };
                      setField("contacts", contacts);
                    }}
                  />
                </td>
                <td>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setField(
                        "contacts",
                        values.contacts.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    削除
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setField("contacts", [
                ...values.contacts,
                {
                  role: "operations",
                  name: "",
                  email: "",
                  isPrimary: values.contacts.length === 0,
                },
              ])
            }
          >
            担当を追加
          </Button>
        </div>
      </Section>

      <Section id="section-notes" title="注意・メモ">
        <div className="grid gap-3">
          <Field
            id={fieldPathToId("alertNote")}
            label="注意（ヘッダ表示・短い）"
            value={values.alertNote ?? ""}
            onChange={(e) => setField("alertNote", e.target.value)}
          />
          <TextAreaField
            id={fieldPathToId("internalMemo")}
            label="内部メモ"
            value={values.internalMemo ?? ""}
            onChange={(e) => setField("internalMemo", e.target.value)}
          />
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-desk-border pt-3">
        {mode === "edit" && accountId ? (
          <Link
            to="/accounts/$accountId"
            params={{ accountId }}
            search={listSearch}
            className="text-sm underline"
          >
            戻る
          </Link>
        ) : (
          <Link to="/accounts" search={listSearch} className="text-sm underline">
            戻る
          </Link>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            保存
          </Button>
        </div>
      </div>
    </form>
  );
}
