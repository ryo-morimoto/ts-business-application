import type { DraftPatch, DraftPayload } from "./schemas";

export function mergePayload(
  current: DraftPayload,
  patch: DraftPatch,
): DraftPayload {
  const next: DraftPayload = { ...current };
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.vendorName !== undefined) next.vendorName = patch.vendorName;
  if (patch.neededBy !== undefined) next.neededBy = patch.neededBy;
  if (patch.note !== undefined) next.note = patch.note;
  if (patch.lines !== undefined) {
    next.lines = patch.lines.map((l) => ({ ...l }));
  }
  return next;
}
