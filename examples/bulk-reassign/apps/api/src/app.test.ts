import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { resetCustomers } from "./store/customers";
import { resetIdempotency } from "./store/idempotency";

const app = createApp();

async function json<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit & { actor?: string },
): Promise<{ status: number; body: T }> {
  const headers = new Headers(init?.headers);
  headers.set("x-actor-id", init?.actor ?? "agent-a");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await app.request(path, { ...init, headers });
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

type ListBody = {
  items: { id: string; assigneeId: string | null; name: string }[];
  total: number;
};

type BulkBody = {
  requestId: string;
  succeeded: { id: string }[];
  failed: { id: string; reason: string }[];
};

beforeEach(() => {
  resetCustomers();
  resetIdempotency();
});

describe("GET /customers", () => {
  it("lists seeded customers", async () => {
    const { status, body } = await json<ListBody>(
      "/customers?page=1&pageSize=10",
    );
    expect(status).toBe(200);
    expect(body.total).toBe(8);
    expect(body.items.length).toBe(8);
  });

  it("filters by query", async () => {
    const { body } = await json<ListBody>("/customers?query=Gamma");
    expect(body.total).toBe(1);
    expect(body.items[0]?.id).toBe("c-003");
  });
});

describe("POST /bulk-assign", () => {
  it("page scope: partial success for agent-a (c-003 denied)", async () => {
    const { status, body } = await json<BulkBody>("/bulk-assign", {
      method: "POST",
      actor: "agent-a",
      body: JSON.stringify({
        requestId: "req-partial-1",
        assigneeId: "u-9",
        scope: {
          mode: "page",
          ids: ["c-001", "c-002", "c-003"],
        },
      }),
    });

    expect(status).toBe(200);
    expect(body.succeeded.map((s) => s.id).sort()).toEqual([
      "c-001",
      "c-002",
    ]);
    expect(body.failed).toEqual([
      { id: "c-003", reason: "missing_permission" },
    ]);

    const list = await json<ListBody>("/customers?pageSize=20", {
      actor: "agent-a",
    });
    const byId = Object.fromEntries(
      list.body.items.map((c) => [c.id, c.assigneeId]),
    );
    expect(byId["c-001"]).toBe("u-9");
    expect(byId["c-003"]).toBe("u-2");
  });

  it("all_matching resolves on server and respects exclusions", async () => {
    const { body } = await json<BulkBody>("/bulk-assign", {
      method: "POST",
      actor: "admin",
      body: JSON.stringify({
        requestId: "req-all-1",
        assigneeId: "u-admin",
        scope: {
          mode: "all_matching",
          filter: { query: "a" },
          excludedIds: ["c-001"],
          estimatedCount: 99,
        },
      }),
    });

    const succeeded = body.succeeded.map((s) => s.id).sort();
    expect(succeeded.length).toBeGreaterThan(0);
    expect(succeeded).not.toContain("c-001");
    expect(body.failed).toEqual([]);
  });

  it("idempotent replay returns the same result without re-applying", async () => {
    const payload = {
      method: "POST" as const,
      actor: "admin",
      body: JSON.stringify({
        requestId: "req-idem-1",
        assigneeId: "u-first",
        scope: { mode: "page", ids: ["c-004"] },
      }),
    };

    const first = await json<BulkBody>("/bulk-assign", payload);
    expect(first.body.succeeded).toEqual([{ id: "c-004" }]);

    const second = await json<BulkBody>("/bulk-assign", {
      method: "POST",
      actor: "admin",
      body: JSON.stringify({
        requestId: "req-idem-1",
        assigneeId: "u-second",
        scope: { mode: "page", ids: ["c-004"] },
      }),
    });

    expect(second.body).toEqual(first.body);

    const list = await json<ListBody>("/customers?query=Delta", {
      actor: "admin",
    });
    expect(list.body.items[0]?.assigneeId).toBe("u-first");
  });

  it("admin has no denied customers", async () => {
    const { body } = await json<BulkBody>("/bulk-assign", {
      method: "POST",
      actor: "admin",
      body: JSON.stringify({
        requestId: "req-admin-1",
        assigneeId: "u-9",
        scope: { mode: "page", ids: ["c-003"] },
      }),
    });
    expect(body.failed).toEqual([]);
    expect(body.succeeded).toEqual([{ id: "c-003" }]);
  });
});
