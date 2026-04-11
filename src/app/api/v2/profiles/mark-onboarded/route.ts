import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { MarkOnboardedInputSchema, MarkOnboardedOutputSchema } from "./schema";

const ROUTE = "v2-profiles-mark-onboarded";

export const PATCH = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      // Read the current onboarding state first so we can distinguish
      // three cases the update-with-filter shape collapses into one:
      //   1. Profile row missing — the signup trigger never created it, or
      //      it was deleted. Returning 200 would leave the client stuck in
      //      onboarding forever because the SSR gate and callback redirect
      //      both read `onboarded_at IS NULL` → always mount the modal →
      //      modal PATCHes → 200 with no write → loop. Surface as 404 so
      //      the caller can re-provision instead.
      //   2. Already onboarded — idempotent no-op, preserve the original
      //      timestamp.
      //   3. Not yet onboarded — write the timestamp.
      const { data: profile, error: profileError } = await supabase
        .from(PROFILES)
        .select("onboarded_at")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw new RecollectApiError("service_unavailable", {
          cause: profileError,
          message: "Failed to load profile",
          operation: "mark_onboarded",
        });
      }

      if (!profile) {
        throw new RecollectApiError("not_found", {
          message: "Profile not found",
          operation: "mark_onboarded",
        });
      }

      if (profile.onboarded_at) {
        // Case 2 — existing timestamp wins, no DB write.
        if (ctx?.fields) {
          ctx.fields.first_onboarding_write = false;
          ctx.fields.onboarded_at = profile.onboarded_at;
        }
        return {};
      }

      // Case 3 — write the timestamp. The `.is("onboarded_at", null)` filter
      // guards against a concurrent write that may have landed between the
      // SELECT above and this UPDATE: if it matches zero rows, another call
      // won the race and we still return success, just with first_write=false.
      const onboardedAt = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from(PROFILES)
        .update({ onboarded_at: onboardedAt })
        .eq("id", userId)
        .is("onboarded_at", null)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Failed to record onboarding completion",
          operation: "mark_onboarded",
        });
      }

      if (ctx?.fields) {
        ctx.fields.first_onboarding_write = Boolean(updated);
        if (updated) {
          ctx.fields.onboarded_at = onboardedAt;
        }
      }

      return {};
    },
    inputSchema: MarkOnboardedInputSchema,
    outputSchema: MarkOnboardedOutputSchema,
    route: ROUTE,
  }),
);
