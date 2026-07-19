import { Hono } from "hono";
import { customerListQuerySchema } from "@bulk-reassign/contracts";
import { filterCustomers } from "@bulk-reassign/domain";
import type { AppEnv } from "../middleware/actor";
import { getCustomers } from "../store/customers";

export const customersRoute = new Hono<AppEnv>();

customersRoute.get("/", (c) => {
  const parsed = customerListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "invalid_query", details: parsed.error.flatten() }, 400);
  }

  const { query, assigneeId, sort, page, pageSize } = parsed.data;
  const filter = { query, assigneeId };
  let items = filterCustomers(getCustomers(), filter);

  items = [...items].sort((a, b) => {
    if (sort === "assigneeId") {
      return (a.assigneeId ?? "").localeCompare(b.assigneeId ?? "");
    }
    return a.name.localeCompare(b.name);
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return c.json({
    items: pageItems,
    total,
    page,
    pageSize,
  });
});
