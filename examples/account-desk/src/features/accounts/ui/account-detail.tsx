import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Banner,
  DefinitionList,
  PageHeader,
  Section,
  StatusChip,
} from "~/design-system";
import { accountDetailQuery } from "../api/accounts.queries";
import type { AccountsSearch } from "../model/list-search";
import { useActor } from "~/shared/actor/actor-context";
import { formatDate, formatYen, TradingStateCluster } from "./trading-state";

const roleLabel: Record<string, string> = {
  hq: "本社",
  bill_to: "請求先",
  ship_to: "納品先",
  primary: "主",
  billing: "請求",
  operations: "現場",
  other: "その他",
};

export function AccountDetail({
  accountId,
  listSearch,
}: {
  accountId: string;
  listSearch: AccountsSearch;
}) {
  const { actor } = useActor();
  const { data } = useSuspenseQuery(accountDetailQuery(accountId));
  const a = data.account;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={a.code}
        title={data.displayName}
        description={
          <span className="break-all text-desk-text">{a.legalName}</span>
        }
        meta={<TradingStateCluster account={a} />}
        actions={
          <>
            <Link
              to="/accounts"
              search={listSearch}
              className="inline-flex items-center border border-desk-border bg-desk-surface px-3 py-1.5 text-sm font-semibold"
            >
              一覧へ戻る
            </Link>
            {actor.role === "editor" ? (
              <Link
                to="/accounts/$accountId/edit"
                params={{ accountId }}
                search={listSearch}
                className="inline-flex items-center border border-desk-focus bg-desk-focus px-3 py-1.5 text-sm font-semibold text-white"
              >
                編集
              </Link>
            ) : null}
          </>
        }
      />

      {a.alertNote ? (
        <Banner tone="warning" title="注意">
          {a.alertNote}
        </Banner>
      ) : null}

      <Section id="section-identity" title="識別・階層">
        <DefinitionList
          items={[
            { term: "正式名称", description: a.legalName },
            { term: "カナ", description: a.nameKana ?? "—" },
            { term: "略称", description: a.tradeName ?? "—" },
            {
              term: "親取引先",
              description: data.parentTradeName ? (
                a.parentAccountId ? (
                  <Link
                    to="/accounts/$accountId"
                    params={{ accountId: a.parentAccountId }}
                    search={listSearch}
                    className="underline"
                  >
                    {data.parentTradeName}
                  </Link>
                ) : (
                  data.parentTradeName
                )
              ) : (
                "—"
              ),
            },
            { term: "社内担当", description: data.ownerLabel },
            { term: "国", description: a.countryCode },
            { term: "タイムゾーン", description: a.timezone ?? "—" },
          ]}
        />
        {data.children.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-desk-muted">子取引先</p>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>コード</th>
                  <th>名称</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {data.children.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        to="/accounts/$accountId"
                        params={{ accountId: c.id }}
                        search={listSearch}
                        className="underline"
                      >
                        {c.code}
                      </Link>
                    </td>
                    <td>{c.displayName}</td>
                    <td>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      <Section id="section-commercial" title="商況・与信">
        <DefinitionList
          items={[
            { term: "ステータス", description: a.status },
            {
              term: "停止理由",
              description: a.statusReason ?? "—",
            },
            {
              term: "与信停止",
              description: a.creditHold
                ? `はい — ${a.creditHoldReason ?? "（理由なし）"}`
                : "いいえ",
            },
            {
              term: "出荷停止",
              description: a.tradeSuspended
                ? a.tradeSuspendReason ?? "はい"
                : "いいえ",
            },
            {
              term: "与信限度",
              description: formatYen(a.creditLimit, a.currency),
            },
            {
              term: "与信残（投影）",
              description: formatYen(data.availableCredit, a.currency),
            },
            { term: "支払サイト", description: `Net ${a.paymentTermsDays}` },
            { term: "通貨", description: a.currency },
            { term: "法人番号", description: a.taxId ?? "—" },
            { term: "請求メール", description: a.invoiceEmail ?? "—" },
          ]}
        />
      </Section>

      <Section
        id="section-readiness"
        title="完備性"
        description="取引マスタの不足。保存しない派生値。"
      >
        {data.readiness.ready ? (
          <p className="text-sm text-desk-success">
            取引マスタは揃っています。
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {data.readiness.issues.map((issue) => (
              <li key={issue.code}>
                <a
                  href={`#section-${issue.section === "basics" ? "identity" : issue.section === "notes" ? "notes" : issue.section === "commercial" ? "commercial" : issue.section === "addresses" ? "addresses" : "contacts"}`}
                  className="underline"
                >
                  {issue.message}
                </a>
                {actor.role === "editor" ? (
                  <>
                    {" "}
                    <Link
                      to="/accounts/$accountId/edit"
                      params={{ accountId }}
                      search={listSearch}
                      className="text-xs underline"
                    >
                      編集へ
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="section-addresses" title="住所">
        <table className="ds-table">
          <thead>
            <tr>
              <th>役割</th>
              <th>default</th>
              <th>ラベル</th>
              <th>住所</th>
              <th>国</th>
            </tr>
          </thead>
          <tbody>
            {a.addresses.map((ad) => (
              <tr key={ad.id}>
                <td>{roleLabel[ad.role] ?? ad.role}</td>
                <td>{ad.isDefaultForRole ? "✓" : ""}</td>
                <td>{ad.label ?? "—"}</td>
                <td>
                  {[ad.postalCode, ad.prefecture, ad.line1, ad.line2]
                    .filter(Boolean)
                    .join(" ")}
                </td>
                <td>{ad.countryCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section id="section-contacts" title="担当">
        {a.contacts.length === 0 ? (
          <p className="text-sm text-desk-muted">担当者なし</p>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>代表</th>
                <th>役割</th>
                <th>氏名</th>
                <th>メール</th>
                <th>電話</th>
                <th>部署</th>
              </tr>
            </thead>
            <tbody>
              {a.contacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.isPrimary ? "✓" : ""}</td>
                  <td>{roleLabel[c.role] ?? c.role}</td>
                  <td>{c.name}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>{c.department ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section id="section-classification" title="分類">
        <DefinitionList
          items={[
            { term: "セグメント", description: a.segment },
            {
              term: "タグ",
              description:
                a.tags.length > 0 ? (
                  <span className="inline-flex flex-wrap gap-1">
                    {a.tags.map((t) => (
                      <StatusChip key={t} label={t} />
                    ))}
                  </span>
                ) : (
                  "—"
                ),
            },
            { term: "業種", description: a.industry ?? "—" },
          ]}
        />
      </Section>

      <Section id="section-ops" title="関連サマリ（読取投影）">
        <DefinitionList
          items={[
            {
              term: "未出荷件数",
              description: String(data.ops.openOrderCount),
            },
            {
              term: "未出荷金額",
              description: formatYen(data.ops.openOrderAmount, a.currency),
            },
            {
              term: "延滞請求",
              description: `${data.ops.overdueInvoiceCount} 件 / ${formatYen(data.ops.overdueAmount, a.currency)}`,
            },
            {
              term: "売掛残高（与信消化）",
              description: formatYen(data.ops.accruedReceivables, a.currency),
            },
            {
              term: "最終受注",
              description: formatDate(data.ops.lastOrderAt),
            },
            {
              term: "最終入金",
              description: formatDate(data.ops.lastPaymentAt),
            },
          ]}
        />
      </Section>

      <Section id="section-events" title="最近の動き">
        {data.events.length === 0 ? (
          <p className="text-sm text-desk-muted">履歴なし</p>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>actor</th>
                <th>内容</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{formatDate(e.at)}</td>
                  <td>{e.actorId}</td>
                  <td>{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section id="section-notes" title="メモ">
        <DefinitionList
          items={[
            { term: "内部メモ", description: a.internalMemo ?? "—" },
            {
              term: "更新",
              description: `${formatDate(a.updatedAt)} · ${a.updatedBy}`,
            },
            { term: "作成", description: formatDate(a.createdAt) },
          ]}
        />
      </Section>

      {actor.role === "viewer" ? (
        <p className="text-xs text-desk-muted">
          viewer のため編集 CTA はありません（API も拒否します）。
        </p>
      ) : null}
    </div>
  );
}
