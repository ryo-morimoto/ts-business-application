import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  accountsSearchFromUnknown,
  type AccountsSearch,
} from "~/features/accounts/model/list-search";

/** Layout for /accounts/:id and /accounts/:id/edit — children render via Outlet. */
export const Route = createFileRoute("/accounts/$accountId")({
  validateSearch: (raw: Record<string, unknown>): AccountsSearch =>
    accountsSearchFromUnknown(raw),
  component: () => <Outlet />,
});
