import { createFileRoute } from "@tanstack/react-router";
import { parentsQuery } from "~/features/accounts/api/accounts.queries";
import {
  accountsSearchFromUnknown,
  type AccountsSearch,
} from "~/features/accounts/model/list-search";
import { AccountCreateForm } from "~/features/accounts/ui/account-form";

export const Route = createFileRoute("/accounts/new")({
  validateSearch: (raw: Record<string, unknown>): AccountsSearch =>
    accountsSearchFromUnknown(raw),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(parentsQuery());
  },
  component: AccountNewPage,
});

function AccountNewPage() {
  const search = Route.useSearch();
  return <AccountCreateForm listSearch={search} />;
}
