import Link from "next/link";
import { createDraftAction } from "@/app/actions/drafts";
import { list } from "@/modules/drafting";
import { ActorBar } from "@/shared/actor/actor-bar";
import { actorFromCookies } from "@/shared/actor/resolve";

export default async function HomePage() {
  const actor = await actorFromCookies();
  const result = list(actor);
  const drafts = result.ok ? result.drafts : [];

  return (
    <main>
      <h1>発注リクエスト · draft-wizard</h1>
      <p className="muted">
        多段作成 · draft/submit スキーマ分離 · Gated Next · RSC + Server Actions + RH
      </p>
      <p className="stack-note">
        業務ルールは <code>modules/drafting</code> のみ。page / actions / api は薄い
        adapter。
      </p>

      <ActorBar actorId={actor.id} />

      <section className="panel">
        <h2>新しい draft</h2>
        <form action={createDraftAction}>
          <button
            type="submit"
            className="primary"
            data-testid="create-draft"
            disabled={!actor.canWrite}
          >
            新規作成
          </button>
          {!actor.canWrite ? (
            <p className="muted">viewer は作成できません</p>
          ) : null}
        </form>
      </section>

      <section className="panel">
        <h2>draft 一覧</h2>
        {drafts.length === 0 ? (
          <p className="muted" data-testid="draft-list-empty">
            まだありません
          </p>
        ) : (
          <table data-testid="draft-list">
            <thead>
              <tr>
                <th>ID</th>
                <th>件名</th>
                <th>状態</th>
                <th>step</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} data-testid={`draft-row-${d.id}`}>
                  <td>
                    <code>{d.id}</code>
                  </td>
                  <td>{d.payload.title || "（未入力）"}</td>
                  <td>{d.status}</td>
                  <td>{d.lastStepId}</td>
                  <td>
                    {d.status === "submitted" && d.submittedId ? (
                      <Link
                        href={`/purchase-requests/${d.submittedId}`}
                        data-testid={`open-pr-${d.submittedId}`}
                      >
                        確定を見る
                      </Link>
                    ) : (
                      <Link
                        href={`/drafts/${d.id}?step=${d.lastStepId}`}
                        data-testid={`open-draft-${d.id}`}
                      >
                        再開
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
