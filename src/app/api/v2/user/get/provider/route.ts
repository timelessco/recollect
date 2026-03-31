import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { PROFILES } from "@/utils/constants";

import { GetProviderInputSchema, GetProviderOutputSchema } from "./schema";

const ROUTE = "v2-user-get-provider";

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { email } = input;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.email = email;
      }

      const supabase = createServerServiceClient();

      const { data, error } = await supabase.from(PROFILES).select("provider").eq("email", email);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch provider",
          operation: "fetch_provider",
        });
      }

      const provider = data?.at(0)?.provider ?? null;

      return { provider };
    },
    inputSchema: GetProviderInputSchema,
    outputSchema: GetProviderOutputSchema,
    route: ROUTE,
  }),
);
