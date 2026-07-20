import { createFileRoute } from "@tanstack/react-router";
import {
  accountDetailQuery,
  parentsQuery,
} from "~/features/accounts/api/accounts.queries";
import {
  accountsSearchFromUnknown,
  type AccountsSearch,
} from "~/features/accounts/model/list-search";
import { AccountEditForm } from "~/features/accounts/ui/account-form";

export const Route = createFileRoute("/accounts/$accountId/edit")({
  validateSearch: (raw: Record<string, unknown>): AccountsSearch =>
    accountsSearchFromUnknown(raw),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        accountDetailQuery(params.accountId),
      ),
      context.queryClient.ensureQueryData(parentsQuery()),
    ]);
  },
  component: AccountEditPage,
});

function AccountEditPage() {
  const { accountId } = Route.useParams();
  const search = Route.useSearch();
  return <AccountEditForm accountId={accountId} listSearch={search} />;
}
