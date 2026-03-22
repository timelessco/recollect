import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { PROFILES } from "@/utils/constants";

import { GetProviderInputSchema, GetProviderOutputSchema } from "./schema";

const ROUTE = "v2-user-get-provider";

export const GET = createGetApiHandler({
  handler: async ({ input, route }) => {
    const { email } = input;

    console.log(`[${route}] API called:`, { email });

    const supabase = createServerServiceClient();

    const { data, error } = await supabase.from(PROFILES).select("provider").eq("email", email);

    if (error) {
      return apiError({
        error,
        message: "Failed to fetch provider",
        operation: "fetch_provider",
        route,
      });
    }

    const provider = data?.at(0)?.provider ?? null;

    return { provider };
  },
  inputSchema: GetProviderInputSchema,
  outputSchema: GetProviderOutputSchema,
  route: ROUTE,
});
