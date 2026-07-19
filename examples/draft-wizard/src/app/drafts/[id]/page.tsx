import Link from "next/link";
import { redirect } from "next/navigation";
import { get, type StepId } from "@/modules/drafting";
import { ActorBar } from "@/shared/actor/actor-bar";
import { actorFromCookies } from "@/shared/actor/resolve";
import { Wizard } from "@/ui/wizard/wizard";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function DraftPage(props: Props) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const actor = await actorFromCookies();
  const result = get(actor, id);

  if (!result.ok) {
    return (
      <main>
        <h1>Draft</h1>
        <p className="flash-error" data-testid="draft-error">
          {result.message}
        </p>
        <Link href="/">一覧へ</Link>
      </main>
    );
  }

  if (result.view.kind === "submitted") {
    redirect(`/purchase-requests/${result.view.id}`);
  }

  const draft = result.view;
  const step = (sp.step as StepId | undefined) ?? draft.lastStepId;

  return (
    <main>
      <h1>Draft · {draft.id}</h1>
      <p className="muted">
        owner={draft.ownerId} · lastStep={draft.lastStepId} · updated{" "}
        {draft.updatedAt}
      </p>
      <ActorBar actorId={actor.id} />
      <p>
        <Link href="/">← 一覧</Link>
      </p>
      <Wizard
        draft={draft}
        initialStep={step}
        canWrite={
          actor.canWrite &&
          (actor.id === draft.ownerId || actor.id === "admin")
        }
      />
    </main>
  );
}
