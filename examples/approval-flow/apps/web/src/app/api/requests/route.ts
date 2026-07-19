import { createRequestBodySchema } from "@approval-flow/contracts";
import { actorFromRequest, json } from "@/server/http";
import { createRequest, listRequests } from "@/server/store";

export function GET() {
  return json({ items: listRequests() });
}

export async function POST(req: Request) {
  const actor = actorFromRequest(req);
  const body = await req.json().catch(() => null);
  const parsed = createRequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid_body", details: parsed.error.flatten() },
      400,
    );
  }

  if (actor.role === "reviewer") {
    return json(
      {
        error: "transition_denied",
        reason: "missing_permission",
      },
      403,
    );
  }

  const row = createRequest({
    title: parsed.data.title,
    body: parsed.data.body,
    authorId: actor.role === "admin" ? "author" : actor.id,
  });
  return json(row, 201);
}
