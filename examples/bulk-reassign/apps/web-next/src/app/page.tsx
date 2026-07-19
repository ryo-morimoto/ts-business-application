import { Suspense } from "react";
import { CustomersWorkbench } from "@/components/customers-workbench";

/**
 * File-based App Router entry (differs from Vite SPA main.tsx).
 * Interactive workbench is a client component; API remains Hono.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<main className="muted">Loading workbench…</main>}>
      <CustomersWorkbench />
    </Suspense>
  );
}
