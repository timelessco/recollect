import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { CompleteOnboardingInputSchema, CompleteOnboardingOutputSchema } from "./schema";

const ROUTE = "v2-profiles-complete-onboarding";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { error } = await supabase
        .from(PROFILES)
        .update({ onboarding_complete: true })
        .eq("id", userId);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to mark onboarding complete",
          operation: "complete_onboarding",
        });
      }

      if (ctx?.fields) {
        ctx.fields.onboarding_marked_complete = true;
      }

      return { onboarding_complete: true as const };
    },
    inputSchema: CompleteOnboardingInputSchema,
    outputSchema: CompleteOnboardingOutputSchema,
    route: ROUTE,
  }),
);
