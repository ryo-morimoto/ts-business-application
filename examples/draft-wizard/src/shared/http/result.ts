export type FieldErrors = Record<string, string[]>;

export type ErrCode =
  | "validation_failed"
  | "step_invalid"
  | "submit_invalid"
  | "already_submitted"
  | "not_found"
  | "forbidden"
  | "conflict_state";

export type OkResult<T> = { ok: true } & T;

export type ErrResult = {
  ok: false;
  code: ErrCode;
  message: string;
  fieldErrors?: FieldErrors;
};

export type Result<T> = OkResult<T> | ErrResult;

export function err(
  code: ErrCode,
  message: string,
  fieldErrors?: FieldErrors,
): ErrResult {
  return fieldErrors
    ? { ok: false, code, message, fieldErrors }
    : { ok: false, code, message };
}

export function httpStatus(result: { ok: boolean; code?: ErrCode }): number {
  if (result.ok) return 200;
  switch (result.code) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    case "already_submitted":
    case "conflict_state":
      return 409;
    case "validation_failed":
    case "step_invalid":
    case "submit_invalid":
      return 400;
    default:
      return 400;
  }
}

export function zodToFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key =
      issue.path.length === 0
        ? "_form"
        : issue.path.map(String).join(".");
    const list = out[key] ?? [];
    list.push(issue.message);
    out[key] = list;
  }
  return out;
}
