import type { StepId } from "./schemas";

export const STEP_ORDER: StepId[] = ["basics", "lines", "review"];

export function nextStep(current: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(current);
  if (i < 0 || i >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[i + 1] ?? null;
}

export function prevStep(current: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(current);
  if (i <= 0) return null;
  return STEP_ORDER[i - 1] ?? null;
}

export function stepIndex(step: StepId): number {
  return STEP_ORDER.indexOf(step);
}

/** May open step if lastStepId has reached it (or any past). */
export function canOpenStep(lastStepId: StepId, target: StepId): boolean {
  return stepIndex(target) <= stepIndex(lastStepId);
}
