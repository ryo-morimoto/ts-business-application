import { createFileRoute } from "@tanstack/react-router";
import { accountsListQuery } from "~/features/accounts/api/accounts.queries";
import {
  accountsSearchFromUnknown,
  defaultAccountsSearch,
  parseAccountsSearch,
  type AccountsSearch,
} from "~/features/accounts/model/list-search";
import { AccountList } from "~/features/accounts/ui/account-list";

export const Route = createFileRoute("/accounts/")({
  validateSearch: (raw: Record<string, unknown>): AccountsSearch =>
    accountsSearchFromUnknown(raw),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const query = parseAccountsSearch(deps);
    await context.queryClient.ensureQueryData(accountsListQuery(query));
  },
  component: AccountsIndexPage,
});

function AccountsIndexPage() {
  const search = Route.useSearch();
  const query = parseAccountsSearch(search);
  return <AccountList query={query} />;
}

export { defaultAccountsSearch };
