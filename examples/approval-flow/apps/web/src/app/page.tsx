import { RequestList } from "@/components/request-list";

export default function HomePage() {
  return (
    <main>
      <header>
        <h1>Requests · approval flow</h1>
        <p className="muted">Next.js full-stack example (no separate API process)</p>
        <p className="stack-note">
          <strong>Plan B:</strong> Route Handlers call{" "}
          <code>@approval-flow/domain</code> in-process. Transition rules are not
          enforced only in the UI.
        </p>
      </header>
      <RequestList />
    </main>
  );
}
