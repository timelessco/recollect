import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { MarkOnboardingCompleteInputSchema, MarkOnboardingCompleteOutputSchema } from "./schema";

const ROUTE = "v2-profiles-mark-onboarding-complete";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data: updated, error } = await supabase
        .from(PROFILES)
        .update({ onboarding_complete: true })
        .eq("id", userId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to mark onboarding complete",
          operation: "mark_onboarding_complete",
        });
      }

      if (!updated) {
        throw new RecollectApiError("not_found", {
          message: "Profile row not found for authenticated user",
          operation: "mark_onboarding_complete",
        });
      }

      if (ctx?.fields) {
        ctx.fields.onboarding_marked_complete = true;
      }

      return {};
    },
    inputSchema: MarkOnboardingCompleteInputSchema,
    outputSchema: MarkOnboardingCompleteOutputSchema,
    route: ROUTE,
  }),
);
