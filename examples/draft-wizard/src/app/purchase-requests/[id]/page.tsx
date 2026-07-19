import Link from "next/link";
import { getPurchaseRequest } from "@/modules/drafting";
import { ActorBar } from "@/shared/actor/actor-bar";
import { actorFromCookies } from "@/shared/actor/resolve";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PurchaseRequestPage(props: Props) {
  const { id } = await props.params;
  const actor = await actorFromCookies();
  const result = getPurchaseRequest(actor, id);

  if (!result.ok) {
    return (
      <main>
        <h1>発注リクエスト</h1>
        <p className="flash-error">{result.message}</p>
        <Link href="/">一覧へ</Link>
      </main>
    );
  }

  const pr = result.submitted;

  return (
    <main>
      <h1>確定 · {pr.id}</h1>
      <p className="muted">
        draft={pr.draftId} · owner={pr.ownerId} · {pr.submittedAt}
      </p>
      <ActorBar actorId={actor.id} />
      <p>
        <Link href="/">← 一覧</Link>
      </p>

      <section className="panel" data-testid="pr-detail">
        <h2>内容</h2>
        <dl>
          <dt>件名</dt>
          <dd data-testid="pr-title">{pr.payload.title}</dd>
          <dt>仕入先</dt>
          <dd data-testid="pr-vendor">{pr.payload.vendorName}</dd>
          {pr.payload.neededBy ? (
            <>
              <dt>希望日</dt>
              <dd>{pr.payload.neededBy}</dd>
            </>
          ) : null}
          {pr.payload.note ? (
            <>
              <dt>メモ</dt>
              <dd>{pr.payload.note}</dd>
            </>
          ) : null}
        </dl>
        <h2>明細</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>数量</th>
              <th>単価</th>
            </tr>
          </thead>
          <tbody>
            {pr.payload.lines.map((line, i) => (
              <tr key={`${line.sku}-${i}`}>
                <td>{line.sku}</td>
                <td>{line.quantity}</td>
                <td>{line.unitPrice ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
