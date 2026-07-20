import { createFileRoute, redirect } from "@tanstack/react-router";
import { defaultAccountsSearch } from "~/features/accounts/model/list-search";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/accounts", search: defaultAccountsSearch });
  },
});
