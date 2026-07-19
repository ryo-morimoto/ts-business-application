import type { AppError, ExternalSystem } from "@fulfillment-desk/contracts";

/**
 * Foreign error shape from the external OMS / inventory / customer APIs.
 * Kept intentionally different from app contracts (snake_case codes).
 */
export type ForeignError = {
  err_code: string;
  err_msg: string;
  details?: Record<string, unknown>;
  /** Foreign rate-limit hint (seconds). */
  retry_after_sec?: number;
};

export type MapExternalErrorContext = {
  correlationId?: string;
  failedSystem?: ExternalSystem;
  failedOperation?: string;
};

/**
 * Anti-corruption: translate external SoR failures into structured app errors.
 * UI never sees raw foreign payloads (no snake_case field dump).
 */
export function mapExternalError(
  foreign: ForeignError,
  ctx: MapExternalErrorContext = {},
): AppError {
  const base = {
    error: "app_error" as const,
    correlationId: ctx.correlationId,
    failedSystem: ctx.failedSystem,
    failedOperation: ctx.failedOperation,
    externalCode: foreign.err_code,
  };

  switch (foreign.err_code) {
    case "not_found":
      return {
        ...base,
        code: "not_found",
        message: foreign.err_msg || "Resource not found on external SoR",
      };
    case "rate_limited": {
      const retry =
        typeof foreign.retry_after_sec === "number" &&
        foreign.retry_after_sec > 0
          ? foreign.retry_after_sec
          : typeof foreign.details?.retry_after_sec === "number"
            ? (foreign.details.retry_after_sec as number)
            : undefined;
      return {
        ...base,
        code: "external_rate_limited",
        message: foreign.err_msg || "External SoR rate limited the request",
        retryAfterSec: retry,
      };
    }
    case "timeout":
      return {
        ...base,
        code: "external_timeout",
        message: foreign.err_msg || "External SoR timed out",
      };
    case "inventory_shortage": {
      const raw = foreign.details?.shortages;
      const shortages = Array.isArray(raw)
        ? raw
            .map((row) => {
              if (!row || typeof row !== "object") return null;
              const r = row as Record<string, unknown>;
              const sku = typeof r.sku === "string" ? r.sku : null;
              const requested =
                typeof r.requested === "number" ? r.requested : null;
              const available =
                typeof r.available === "number" ? r.available : null;
              if (!sku || requested === null || available === null) return null;
              return { sku, requested, available };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
        : undefined;
      return {
        ...base,
        code: "inventory_shortage",
        message: foreign.err_msg || "Insufficient inventory on external SoR",
        shortages,
      };
    }
    case "invalid_state":
      return {
        ...base,
        code: "wrong_state",
        message: foreign.err_msg || "Order is not shippable in current state",
      };
    case "validation_error":
      return {
        ...base,
        code: "external_validation",
        message: foreign.err_msg || "External SoR rejected the payload",
      };
    default:
      return {
        ...base,
        code: "external_unavailable",
        message: foreign.err_msg || "External SoR error",
      };
  }
}

/** Mark a mid-pipeline SoR failure as composition_failed (keeps underlying code in externalCode). */
export function asCompositionFailure(
  mapped: AppError,
  failedSystem: ExternalSystem,
  failedOperation: string,
): AppError {
  if (
    mapped.code === "not_found" ||
    mapped.code === "external_timeout" ||
    mapped.code === "external_unavailable" ||
    mapped.code === "external_validation" ||
    mapped.code === "external_rate_limited"
  ) {
    return {
      ...mapped,
      code: "composition_failed",
      message: `Composition stopped at ${failedSystem}.${failedOperation}: ${mapped.message}`,
      failedSystem,
      failedOperation,
    };
  }
  return {
    ...mapped,
    failedSystem,
    failedOperation,
  };
}

export function httpStatusForAppError(code: AppError["code"]): number {
  switch (code) {
    case "not_found":
      return 404;
    case "missing_permission":
      return 403;
    case "wrong_state":
    case "inventory_shortage":
      return 409;
    case "external_rate_limited":
      return 429;
    case "external_timeout":
    case "external_unavailable":
    case "composition_failed":
      return 502;
    case "unsupported_filter":
    case "invalid_body":
    case "external_validation":
      return 400;
    default:
      return 400;
  }
}
