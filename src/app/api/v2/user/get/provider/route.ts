import { type NextRequest } from "next/server";

import { GetProviderInputSchema, GetProviderOutputSchema } from "./schema";
import { type HandlerConfig } from "@/lib/api-helpers/create-handler";
import { apiError, apiSuccess, parseQuery } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { PROFILES } from "@/utils/constants";

const ROUTE = "v2-user-get-provider";

async function handleGet(request: NextRequest) {
	try {
		const query = parseQuery({
			request,
			schema: GetProviderInputSchema,
			route: ROUTE,
		});

		if (query.errorResponse) {
			return query.errorResponse;
		}

		const { email } = query.data;

		console.log(`[${ROUTE}] API called:`, { email });

		const supabase = await createServerServiceClient();

		const { data, error } = await supabase
			.from(PROFILES)
			.select("provider")
			.eq("email", email);

		if (error) {
			return apiError({
				route: ROUTE,
				message: "Failed to fetch provider",
				error,
				operation: "fetch_provider",
			});
		}

		const provider = data?.at(0)?.provider ?? null;

		return apiSuccess({
			route: ROUTE,
			data: { provider },
			schema: GetProviderOutputSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "v2_user_get_provider_unexpected",
		});
	}
}

export const GET = Object.assign(handleGet, {
	config: {
		factoryName: "createGetApiHandler",
		inputSchema: GetProviderInputSchema,
		outputSchema: GetProviderOutputSchema,
		route: ROUTE,
	} satisfies HandlerConfig,
});
