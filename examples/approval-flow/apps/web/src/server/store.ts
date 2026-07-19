import type { ApprovalRequest } from "@approval-flow/contracts";

const SEED: ApprovalRequest[] = [
  {
    id: "r-001",
    title: "New laptop",
    body: "Replace aging machine",
    status: "draft",
    authorId: "author",
    rejectReason: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "r-002",
    title: "Conference travel",
    body: "Tokyo conference Q2",
    status: "submitted",
    authorId: "author",
    rejectReason: null,
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "r-003",
    title: "Design tools",
    body: "Figma seats",
    status: "rejected",
    authorId: "author",
    rejectReason: "Budget freeze",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
];

let requests: ApprovalRequest[] = structuredClone(SEED);
let seq = 100;

export function listRequests(): ApprovalRequest[] {
  return [...requests].sort((a, b) => a.id.localeCompare(b.id));
}

export function getRequest(id: string): ApprovalRequest | undefined {
  return requests.find((r) => r.id === id);
}

export function saveRequest(next: ApprovalRequest): void {
  const idx = requests.findIndex((r) => r.id === next.id);
  if (idx === -1) {
    requests.push(next);
  } else {
    requests[idx] = next;
  }
}

export function createRequest(input: {
  title: string;
  body: string;
  authorId: string;
}): ApprovalRequest {
  seq += 1;
  const row: ApprovalRequest = {
    id: `r-${String(seq).padStart(3, "0")}`,
    title: input.title,
    body: input.body,
    status: "draft",
    authorId: input.authorId,
    rejectReason: null,
    updatedAt: new Date().toISOString(),
  };
  requests.push(row);
  return row;
}

export function resetStore(): void {
  requests = structuredClone(SEED);
  seq = 100;
}
