import { OrderList } from "@/components/order-list";

export default function HomePage() {
  return (
    <main>
      <header>
        <h1>Fulfillment desk · external OMS as SoR</h1>
        <p className="muted">
          Next.js only — UI + BFF Route Handlers; truth lives in a foreign mock
          API
        </p>
        <p className="stack-note">
          <strong>External SoR:</strong> foreign OMS / customer / inventory
          (snake_case). BFF composes with <em>provenance</em>, maps errors
          (incl. retry-after / budget timeout), and rejects unsupported filters
          instead of faking search.
        </p>
      </header>
      <OrderList />
    </main>
  );
}
