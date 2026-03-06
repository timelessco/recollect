import { GetProviderInputSchema, GetProviderOutputSchema } from "./schema";
import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { PROFILES } from "@/utils/constants";

const ROUTE = "v2-user-get-provider";

export const GET = createGetApiHandler({
	route: ROUTE,
	inputSchema: GetProviderInputSchema,
	outputSchema: GetProviderOutputSchema,
	handler: async ({ input, route }) => {
		const { email } = input;

		console.log(`[${route}] API called:`, { email });

		const supabase = await createServerServiceClient();

		const { data, error } = await supabase
			.from(PROFILES)
			.select("provider")
			.eq("email", email);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch provider",
				error,
				operation: "fetch_provider",
			});
		}

		const provider = data?.at(0)?.provider ?? null;

		return { provider };
	},
});
