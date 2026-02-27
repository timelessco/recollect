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
// Internal helpers
// ============================================================

async function parseInput<TInput>(
	request: NextRequest,
	schema: z.ZodType<TInput>,
	route: string,
	method: "body" | "query",
) {
	if (method === "query") {
		return parseQuery({ request, schema, route });
	}
	return parseBody({ request, schema, route });
}

function createPublicHandlerInternal<TInput, TOutput>(
	config: PublicHandlerConfig<TInput, TOutput>,
	factoryName: string,
	method: "body" | "query",
): HandlerFn {
	const { route, inputSchema, outputSchema, handler } = config;

	const fn = async (request: NextRequest) => {
		try {
			const parsed = await parseInput(request, inputSchema, route, method);
			if (parsed.errorResponse) {
				return parsed.errorResponse;
			}

			const result = await handler({ input: parsed.data, route });

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

	fn.config = { factoryName, inputSchema, outputSchema, route };

	return fn;
}

function createAuthHandlerInternal<TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
	factoryName: string,
	method: "body" | "query",
): HandlerFn {
	const { route, inputSchema, outputSchema, handler } = config;

	const fn = async (request: NextRequest) => {
		try {
			const auth = await requireAuth(route);
			if (auth.errorResponse) {
				return auth.errorResponse;
			}

			const parsed = await parseInput(request, inputSchema, route, method);
			if (parsed.errorResponse) {
				return parsed.errorResponse;
			}

			const { supabase, user } = auth;
			const result = await handler({
				data: parsed.data,
				supabase,
				user,
				route,
			});

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

	fn.config = { factoryName, inputSchema, outputSchema, route };

	return fn;
}

// ============================================================
// Public Handlers (no auth)
// ============================================================

export const createGetApiHandler = <TInput, TOutput>(
	config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn =>
	createPublicHandlerInternal(config, "createGetApiHandler", "query");

export const createPostApiHandler = <TInput, TOutput>(
	config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn =>
	createPublicHandlerInternal(config, "createPostApiHandler", "body");

// ============================================================
// Authenticated Handlers (with auth)
// ============================================================

export const createGetApiHandlerWithAuth = <TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn =>
	createAuthHandlerInternal(config, "createGetApiHandlerWithAuth", "query");

export const createPostApiHandlerWithAuth = <TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn =>
	createAuthHandlerInternal(config, "createPostApiHandlerWithAuth", "body");

export const createPatchApiHandlerWithAuth = <TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn =>
	createAuthHandlerInternal(config, "createPatchApiHandlerWithAuth", "body");

export const createPutApiHandlerWithAuth = <TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn =>
	createAuthHandlerInternal(config, "createPutApiHandlerWithAuth", "body");

export const createDeleteApiHandlerWithAuth = <TInput, TOutput>(
	config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn =>
	createAuthHandlerInternal(config, "createDeleteApiHandlerWithAuth", "body");

// ============================================================
// Secret-authenticated Handlers
// ============================================================

type SecretHandlerConfig<TInput, TOutput> = PublicHandlerConfig<
	TInput,
	TOutput
> & {
	secretEnvVar: string;
};

export const createGetApiHandlerWithSecret = <TInput, TOutput>(
	config: SecretHandlerConfig<TInput, TOutput>,
): HandlerFn => {
	const { route, inputSchema, outputSchema, handler, secretEnvVar } = config;

	const fn = async (request: NextRequest) => {
		try {
			const secret = process.env[secretEnvVar];
			if (!secret) {
				console.error(`[${route}] ${secretEnvVar} is not configured`);
				return NextResponse.json(
					{ data: null, error: "Server configuration error" },
					{ status: 500 },
				);
			}

			const authHeader = request.headers.get("authorization");
			if (authHeader !== `Bearer ${secret}`) {
				return NextResponse.json(
					{ data: null, error: "Unauthorized" },
					{ status: 401 },
				);
			}

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
		factoryName: "createGetApiHandlerWithSecret",
		inputSchema,
		outputSchema,
		route,
	};

	return fn;
};
