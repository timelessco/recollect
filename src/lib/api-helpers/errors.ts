/**
 * Typed API error codes and structured error class for v2 route handlers.
 *
 * ERROR_CODES maps error code strings to HTTP status numbers.
 * RecollectApiError carries structured context for Axiom logging
 * and produces the bare `{ error: string }` shape for HTTP responses.
 */

/**
 * Extract loggable fields from the cause of a RecollectApiError.
 * Handles Supabase PostgrestError (code, message, details, hint) and plain Error objects.
 */
function extractCauseFields(cause: unknown): Record<string, unknown> {
  if (!cause || typeof cause !== "object") {
    return {};
  }

  const result: Record<string, unknown> = {};

  if ("message" in cause && typeof cause.message === "string") {
    result.cause_message = cause.message;
  }

  if ("code" in cause && typeof cause.code === "string") {
    result.cause_code = cause.code;
  }

  if ("details" in cause && typeof cause.details === "string") {
    result.cause_details = cause.details;
  }

  if ("hint" in cause && typeof cause.hint === "string") {
    result.cause_hint = cause.hint;
  }

  return result;
}

export const ERROR_CODES = {
  bad_request: 400,
  bookmark_not_found: 404,
  category_limit_reached: 422,
  conflict: 409,
  forbidden: 403,
  not_found: 404,
  rate_limit_exceeded: 429,
  service_unavailable: 503,
  unauthorized: 401,
  unprocessable_entity: 422,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

interface RecollectApiErrorOptions {
  cause?: unknown;
  context?: Record<string, unknown>;
  message: string;
  operation?: string;
}

export class RecollectApiError extends Error {
  readonly code: ErrorCode;
  readonly context: Record<string, unknown> | undefined;
  readonly operation: string | undefined;
  readonly status: number;

  constructor(code: ErrorCode, options: RecollectApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "RecollectApiError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.operation = options.operation;
    this.context = options.context;
  }

  /** Serialize for Axiom structured logging — includes cause details for debugging */
  toLogContext(): Record<string, unknown> {
    const causeFields = extractCauseFields(this.cause);

    return {
      error_code: this.code,
      error_message: this.message,
      http_status: this.status,
      ...(this.operation ? { operation: this.operation } : {}),
      ...(this.context ? { error_context: JSON.stringify(this.context) } : {}),
      ...causeFields,
    };
  }

  /** Serialize for HTTP response — only user-safe fields */
  toResponse(): { error: string } {
    return { error: this.message };
  }
}
