import { createFileRoute } from "@tanstack/react-router";
import { accountDetailQuery } from "~/features/accounts/api/accounts.queries";
import { AccountDetail } from "~/features/accounts/ui/account-detail";

export const Route = createFileRoute("/accounts/$accountId/")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      accountDetailQuery(params.accountId),
    );
  },
  component: AccountDetailPage,
});

function AccountDetailPage() {
  const { accountId } = Route.useParams();
  const search = Route.useSearch();
  return <AccountDetail accountId={accountId} listSearch={search} />;
}
