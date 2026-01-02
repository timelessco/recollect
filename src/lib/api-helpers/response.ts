import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { type z, type ZodSchema } from "zod";

import { HttpStatus } from "@/utils/error-utils/common";

// Response type shapes
type ApiSuccessResponse<T> = { data: T; error: null };
type ApiErrorResponse = { data: null; error: string };

// Union type for all API responses - export for route handler return types
export type ApiResponse<T> = ApiErrorResponse | ApiSuccessResponse<T>;

type ApiWarnProps = {
	context?: Record<string, unknown>;
	message: string;
	route: string;
	status: number;
};

type ApiErrorProps = {
	error: unknown;
	extra?: Record<string, unknown>;
	message: string;
	operation: string;
	route: string;
	userId?: string | null;
};

/**
 * Warning response for user errors (4xx status codes).
 * Logs to console.warn but does NOT send to Sentry.
 * Use for validation errors, not found, permission denied, etc.
 */
export function apiWarn({
	route,
	message,
	status,
	context,
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
	route,
	message,
	error,
	operation,
	userId = null,
	extra,
}: ApiErrorProps): NextResponse<ApiErrorResponse> {
	console.error(`[${route}] ${message}`, { error, ...extra });
	Sentry.captureException(error, {
		tags: { operation, ...(userId && { userId }) },
		extra,
	});

	return NextResponse.json(
		{ data: null, error: message },
		{ status: HttpStatus.INTERNAL_SERVER_ERROR },
	);
}

type ApiSuccessProps<T extends z.ZodType> = {
	data: unknown;
	route: string;
	schema: T;
	status?: number;
};

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
	route,
	data,
	schema,
	status = 200,
}: ApiSuccessProps<T>): NextResponse<ApiSuccessResponse<z.infer<T>>> {
	const parsed = schema.safeParse(data);

	if (!parsed.success) {
		throw new Error(
			`[${route}] Output validation failed: ${JSON.stringify(parsed.error.issues)}`,
		);
	}

	return NextResponse.json({ data: parsed.data, error: null }, { status });
}

type ParseBodyResult<T> =
	| { data: T; errorResponse: null }
	| { data: null; errorResponse: NextResponse<ApiErrorResponse> };

type ParseBodyProps<T> = {
	request: Request;
	route: string;
	schema: ZodSchema<T>;
};

/**
 * Parse and validate request body against a Zod schema.
 * Returns discriminated union for type narrowing (same pattern as requireAuth).
 */
export async function parseBody<T>({
	request,
	schema,
	route,
}: ParseBodyProps<T>): Promise<ParseBodyResult<T>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch (error) {
		return {
			data: null,
			errorResponse: apiWarn({
				route,
				message: "Invalid JSON in request body",
				status: HttpStatus.BAD_REQUEST,
				context: {
					error: error instanceof Error ? error.message : String(error),
				},
			}),
		};
	}

	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		// Use first Zod error message for user-friendly display
		const firstError = parsed.error.issues[0];
		const userMessage = firstError?.message || "Invalid input";

		return {
			data: null,
			errorResponse: apiWarn({
				route,
				message: userMessage,
				status: HttpStatus.BAD_REQUEST,
				context: { errors: parsed.error.issues },
			}),
		};
	}

	return { data: parsed.data, errorResponse: null };
}

type ParseQueryResult<T> =
	| { data: T; errorResponse: null }
	| { data: null; errorResponse: NextResponse<ApiErrorResponse> };

type ParseQueryProps<T> = {
	request: NextRequest;
	route: string;
	schema: ZodSchema<T>;
};

/**
 * Parse and validate query parameters against a Zod schema.
 * Returns discriminated union for type narrowing (same pattern as parseBody).
 * Query parameters are passed as strings, so use z.coerce.* or z.string() in your schema.
 */
export function parseQuery<T>({
	request,
	schema,
	route,
}: ParseQueryProps<T>): ParseQueryResult<T> {
	const { searchParams } = new URL(request.url);
	const queryObject: Record<string, string | undefined> = {};

	// Convert URLSearchParams to object
	// Note: searchParams.get() returns null if not found, but we use undefined
	// to match typical query param handling patterns
	for (const key of searchParams.keys()) {
		const value = searchParams.get(key);
		queryObject[key] = value ?? undefined;
	}

	const parsed = schema.safeParse(queryObject);

	if (!parsed.success) {
		// Use first Zod error message for user-friendly display
		const firstError = parsed.error.issues[0];
		const userMessage = firstError?.message || "Invalid query parameters";

		return {
			data: null,
			errorResponse: apiWarn({
				route,
				message: userMessage,
				status: HttpStatus.BAD_REQUEST,
				context: { errors: parsed.error.issues },
			}),
		};
	}

	return { data: parsed.data, errorResponse: null };
}
