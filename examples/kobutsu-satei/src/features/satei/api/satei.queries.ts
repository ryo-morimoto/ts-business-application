import { queryOptions } from "@tanstack/react-query";
import {
  getRuleSetFn,
  getTicketFn,
  listReportsFn,
  listRuleSetsFn,
  listTicketsFn,
} from "./satei.functions";

export const sateiQueries = {
  tickets: () =>
    queryOptions({
      queryKey: ["satei", "tickets"],
      queryFn: () => listTicketsFn(),
    }),
  ticket: (id: string) =>
    queryOptions({
      queryKey: ["satei", "ticket", id],
      queryFn: () => getTicketFn({ data: { id } }),
    }),
  ruleSets: () =>
    queryOptions({
      queryKey: ["satei", "rulesets"],
      queryFn: () => listRuleSetsFn(),
    }),
  ruleSet: (version: number) =>
    queryOptions({
      queryKey: ["satei", "ruleset", version],
      queryFn: () => getRuleSetFn({ data: { version } }),
    }),
  reports: () =>
    queryOptions({
      queryKey: ["satei", "reports"],
      queryFn: () => listReportsFn(),
    }),
};
