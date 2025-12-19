import { NextResponse, type NextRequest } from "next/server";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { type z } from "zod";

import { apiError, apiSuccess, parseBody } from "./response";
import { requireAuth } from "@/lib/supabase/api";
import { type Database } from "@/types/database.types";

type HandlerContext<TInput> = {
	data: TInput;
	route: string;
	supabase: SupabaseClient<Database>;
	user: User;
};

type CreateSupabasePostApiHandlerConfig<TInput, TOutput> = {
	handler: (ctx: HandlerContext<TInput>) => Promise<NextResponse | TOutput>;
	inputSchema: z.ZodType<TInput>;
	outputSchema: z.ZodType<TOutput>;
	route: string;
};

export const createSupabasePostApiHandler = <TInput, TOutput>(
	config: CreateSupabasePostApiHandlerConfig<TInput, TOutput>,
) => {
	const { route, inputSchema, outputSchema, handler } = config;

	return async (request: NextRequest) => {
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
};
