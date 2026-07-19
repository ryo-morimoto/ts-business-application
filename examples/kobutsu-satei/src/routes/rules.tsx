import { createFileRoute } from "@tanstack/react-router";
import { sateiQueries } from "~/features/satei/api/satei.queries";
import { RulesCms } from "~/features/satei/ui/rules-cms";

export const Route = createFileRoute("/rules")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(sateiQueries.ruleSets()),
  component: RulesPage,
});

function RulesPage() {
  return <RulesCms />;
}
