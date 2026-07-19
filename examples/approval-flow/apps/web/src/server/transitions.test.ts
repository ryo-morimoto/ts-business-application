import { beforeEach, describe, expect, it } from "vitest";
import { POST as transitionPost } from "@/app/api/requests/[id]/transitions/route";
import { POST as resetPost } from "@/app/api/__test__/reset/route";

function req(
  action: string,
  actor: string,
  body: Record<string, unknown> = {},
) {
  return new Request("http://127.0.0.1/api/requests/r-001/transitions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-actor-id": actor,
    },
    body: JSON.stringify({ action, ...body }),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(async () => {
  await resetPost();
});

describe("POST /api/requests/:id/transitions", () => {
  it("author submits draft r-001", async () => {
    const res = await transitionPost(req("submit", "author"), ctx("r-001"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("submitted");
  });

  it("reviewer cannot approve draft (wrong_state)", async () => {
    const res = await transitionPost(req("approve", "reviewer"), ctx("r-001"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({
      error: "transition_denied",
      reason: "wrong_state",
      currentStatus: "draft",
      action: "approve",
    });
  });

  it("author cannot approve submitted (missing_permission)", async () => {
    const res = await transitionPost(req("approve", "author"), ctx("r-002"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("missing_permission");
  });

  it("reject without reason fails", async () => {
    const res = await transitionPost(req("reject", "reviewer"), ctx("r-002"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.reason).toBe("reason_required");
  });

  it("reviewer rejects submitted with reason", async () => {
    const res = await transitionPost(
      req("reject", "reviewer", { reason: "Need quotes" }),
      ctx("r-002"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("rejected");
    expect(body.rejectReason).toBe("Need quotes");
  });

  it("not_found for unknown id", async () => {
    const res = await transitionPost(req("submit", "author"), ctx("r-missing"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.reason).toBe("not_found");
  });
});
