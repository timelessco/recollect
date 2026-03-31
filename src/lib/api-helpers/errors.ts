/**
 * Typed API error codes and structured error class for v2 route handlers.
 *
 * ERROR_CODES maps error code strings to HTTP status numbers.
 * RecollectApiError carries structured context for Axiom logging
 * and produces the bare `{ error: string }` shape for HTTP responses.
 */

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

  /** Serialize for Axiom structured logging — excludes cause (logged separately) */
  toLogContext(): Record<string, unknown> {
    return {
      error_code: this.code,
      error_message: this.message,
      http_status: this.status,
      ...(this.operation ? { operation: this.operation } : {}),
      ...(this.context ? { error_context: this.context } : {}),
    };
  }

  /** Serialize for HTTP response — only user-safe fields */
  toResponse(): { error: string } {
    return { error: this.message };
  }
}
