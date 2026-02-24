import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { type z } from "zod";

import { apiError, apiSuccess, parseBody, parseQuery } from "./response";
import { requireAuth } from "@/lib/supabase/api";
import { type Database } from "@/types/database.types";

// Context types for handlers
type AuthHandlerContext<TInput> = {
	data: TInput;
	route: string;
	supabase: SupabaseClient<Database>;
	user: User;
};

type PublicHandlerContext<TInput> = {
	input: TInput;
	route: string;
};

// Config types
type AuthHandlerConfig<TInput, TOutput> = {
	handler: (ctx: AuthHandlerContext<TInput>) => Promise<NextResponse | TOutput>;
	inputSchema: z.ZodType<TInput>;
	outputSchema: z.ZodType<TOutput>;
	route: string;
};

type PublicHandlerConfig<TInput, TOutput> = {
	handler: (
		ctx: PublicHandlerContext<TInput>,
	) => Promise<NextResponse | TOutput>;
	inputSchema: z.ZodType<TInput>;
	outputSchema: z.ZodType<TOutput>;
	route: string;
};

export type HandlerConfig = {
	factoryName: string;
	inputSchema: z.ZodTypeAny;
	outputSchema: z.ZodTypeAny;
	route: string;
};

type HandlerFn = ((request: NextRequest) => Promise<NextResponse>) & {
	config: HandlerConfig;
};

// ============================================================
// Public Handlers (no auth)
// ============================================================

export const createGetApiHandler = <TInput, TOutput>(
	config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn => {
	const { route, inputSchema, outputSchema, handler } = config;

	const fn = async (request: NextRequest) => {
		try {
			const query = parseQuery({ request, schema: inputSchema, route });
			if (query.errorResponse) {
				return query.errorResponse;
			}

			const result = await handler({ input: query.data, route });

			if (result instanceof NextResponse) {
				return result;
			}

			return apiSuccess({ route, data: result, schema: outputSchema });
		} catch (error) {
			return apiError({
				route,
				message: "An unexpected error occurred",
				error,
				operation: `${route}_unexpected`,
			});
		}
	};

	fn.config = {
		factoryName: "createGetApiHandler",
		inputSchema,
		outputSchema,
		route,
	};

	return fn;
};

export const createPostApiHandler = <TInput, TOutput>(
	config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn => {
	const { route, inputSchema, outputSchema, handler } = config;

	const fn = async (request: NextRequest) => {
		try {
			const body = await parseBody({ request, schema: inputSchema, route });
			if (body.errorResponse) {
				return body.errorResponse;
			}

			const result = await handler({ input: body.data, route });

			if (result instanceof NextResponse) {
				return result;
			}

			return apiSuccess({ route, data: result, schema: outputSchema });
		} catch (error) {
			return apiError({
				route,
				message: "An unexpected error occurred",
				error,
				operation: `${route}_unexpected`,
			});
		}
	};

	fn.config = {
		factoryName: "createPostApiHandler",
		inputSchema,
		outputSchema,
		route,
	};

	return fn;
};

// ============================================================
// Authenticated Handlers (with auth)
// ============================================================

export const createGetApiHandlerWithAuth = <TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => {
	const { route, inputSchema, outputSchema, handler } = config;

	const fn = async (request: NextRequest) => {
		try {
			const auth = await requireAuth(route);
			if (auth.errorResponse) {
				return auth.errorResponse;
			}

			const query = parseQuery({ request, schema: inputSchema, route });
			if (query.errorResponse) {
				return query.errorResponse;
			}

			const { supabase, user } = auth;
			const result = await handler({ data: query.data, supabase, user, route });

			if (result instanceof NextResponse) {
				return result;
			}

			return apiSuccess({ route, data: result, schema: outputSchema });
		} catch (error) {
			return apiError({
				route,
				message: "An unexpected error occurred",
				error,
				operation: `${route}_unexpected`,
			});
		}
	};

	fn.config = {
		factoryName: "createGetApiHandlerWithAuth",
		inputSchema,
		outputSchema,
		route,
	};

	return fn;
};

export const createPostApiHandlerWithAuth = <TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => {
	const { route, inputSchema, outputSchema, handler } = config;

	const fn = async (request: NextRequest) => {
		try {
			const auth = await requireAuth(route);
			if (auth.errorResponse) {
				return auth.errorResponse;
			}

			const body = await parseBody({ request, schema: inputSchema, route });
			if (body.errorResponse) {
				return body.errorResponse;
			}

			const { supabase, user } = auth;
			const result = await handler({ data: body.data, supabase, user, route });

			if (result instanceof NextResponse) {
				return result;
			}

			return apiSuccess({ route, data: result, schema: outputSchema });
		} catch (error) {
			return apiError({
				route,
				message: "An unexpected error occurred",
				error,
				operation: `${route}_unexpected`,
			});
		}
	};

	fn.config = {
		factoryName: "createPostApiHandlerWithAuth",
		inputSchema,
		outputSchema,
		route,
	};

	return fn;
};
