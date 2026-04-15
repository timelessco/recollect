import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import * as Sentry from "@sentry/nextjs";

import type { z } from "zod";

import { HttpStatus } from "@/utils/error-utils/common";

// Response type shapes
interface ApiSuccessResponse<T> {
  data: T;
  error: null;
}
interface ApiErrorResponse {
  data: null;
  error: string;
}

// Union type for all API responses - export for route handler return types
export type ApiResponse<T> = ApiErrorResponse | ApiSuccessResponse<T>;

interface ApiWarnProps {
  context?: Record<string, unknown>;
  message: string;
  route: string;
  status: number;
}

interface ApiErrorProps {
  error: unknown;
  extra?: Record<string, unknown>;
  message: string;
  operation: string;
  route: string;
  userId?: null | string;
}

/**
 * Warning response for user errors (4xx status codes).
 * Logs to console.warn but does NOT send to Sentry.
 * Use for validation errors, not found, permission denied, etc.
 */
export function apiWarn({
  context,
  message,
  route,
  status,
}: ApiWarnProps): NextResponse<ApiErrorResponse> {
  console.warn(`[${route}] ${message}`, context);

  return NextResponse.json({ data: null, error: message }, { status });
}

/**
 * Error response for system errors (5xx status codes).
 * Logs to console.error AND sends to Sentry with tags.
 * Use for database errors, unexpected failures, etc.
 */
export function apiError({
  error,
  extra,
  message,
  operation,
  route,
  userId = null,
}: ApiErrorProps): NextResponse<ApiErrorResponse> {
  console.error(`[${route}] ${message}`, { error, ...extra });
  Sentry.captureException(error, {
    extra,
    tags: { operation, ...(userId && { userId }) },
  });

  return NextResponse.json(
    { data: null, error: message },
    { status: HttpStatus.INTERNAL_SERVER_ERROR },
  );
}

interface ApiSuccessProps<T extends z.ZodType> {
  data: unknown;
  route: string;
  schema: T;
  status?: number;
}

/**
 * Success response with strict output validation.
 * @throws {Error} If outputSchema validation fails. This is intentional -
 * the throw is caught by the route's catch block which returns a generic
 * "unexpected error" to the user, hiding internal validation details.
 * The error is still logged and captured by Sentry for debugging.
 * @example
 * // In a route handler:
 * try {
 *   return apiSuccess({ route, data: result, schema: OutputSchema });
 * } catch (error) {
 *   return apiError({ route, message: "Unexpected error", error, operation: "..." });
 * }
 */
export function apiSuccess<T extends z.ZodType>({
  data,
  route,
  schema,
  status = 200,
}: ApiSuccessProps<T>): NextResponse<ApiSuccessResponse<z.infer<T>>> {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new Error(`[${route}] Output validation failed: ${JSON.stringify(parsed.error.issues)}`);
  }

  return NextResponse.json({ data: parsed.data, error: null }, { status });
}

type ParseBodyResult<T> =
  | { data: null; errorResponse: NextResponse<ApiErrorResponse> }
  | { data: T; errorResponse: null };

interface ParseBodyProps<T> {
  request: Request;
  route: string;
  schema: z.ZodType<T>;
}

/**
 * Parse and validate request body against a Zod schema.
 * Returns discriminated union for type narrowing (same pattern as requireAuth).
 */
export async function parseBody<T>({
  request,
  route,
  schema,
}: ParseBodyProps<T>): Promise<ParseBodyResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return {
      data: null,
      errorResponse: apiWarn({
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
        message: "Invalid JSON in request body",
        route,
        status: HttpStatus.BAD_REQUEST,
      }),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    // Use first Zod error message for user-friendly display
    const [firstError] = parsed.error.issues;
    const userMessage = firstError?.message || "Invalid input";

    return {
      data: null,
      errorResponse: apiWarn({
        context: { errors: parsed.error.issues },
        message: userMessage,
        route,
        status: HttpStatus.BAD_REQUEST,
      }),
    };
  }

  return { data: parsed.data, errorResponse: null };
}

type ParseQueryResult<T> =
  | { data: null; errorResponse: NextResponse<ApiErrorResponse> }
  | { data: T; errorResponse: null };

interface ParseQueryProps<T> {
  request: NextRequest;
  route: string;
  schema: z.ZodType<T>;
}

/**
 * Parse and validate query parameters against a Zod schema.
 * Returns discriminated union for type narrowing (same pattern as parseBody).
 * Query parameters are strings - use z.coerce.* for numeric values.
 */
export function parseQuery<T>({ request, route, schema }: ParseQueryProps<T>): ParseQueryResult<T> {
  const { searchParams } = request.nextUrl;
  const params = Object.fromEntries(searchParams.entries());

  const parsed = schema.safeParse(params);

  if (!parsed.success) {
    const [firstError] = parsed.error.issues;
    const userMessage = firstError?.message || "Invalid query parameters";

    return {
      data: null,
      errorResponse: apiWarn({
        context: { errors: parsed.error.issues },
        message: userMessage,
        route,
        status: HttpStatus.BAD_REQUEST,
      }),
    };
  }

  return { data: parsed.data, errorResponse: null };
}
