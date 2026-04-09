import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerContext } from "@/lib/api-helpers/server-context";

/**
 * API-side post-login redirect resolver for App Router auth callbacks.
 *
 * Fetches the just-authenticated user, reads their profile's
 * `onboarding_complete` flag, and returns `/discover` for first-timers
 * or `nextPath` for everyone else. Silent fallbacks (getUser returning
 * nothing right after a successful auth operation, profile SELECT
 * failing) are recorded in Axiom wide events via `ctx.fields` so the
 * edge cases are searchable in production without Sentry.
 *
 * This is the PRIMARY detection layer. The /discover SSR gate in
 * src/pages/[category_id].tsx is the BACKSTOP — even if this helper
 * misroutes a first-timer, the gate still catches them.
 *
 * Used by both App Router auth callback handlers: /auth/confirm
 * (magic link / email OTP) and /auth/oauth (Google / Apple sign-in).
 *
 * **API-side only.** The frontend counterpart lives in
 * `./post-login-redirect` and is used by the client-side OTP verify
 * form (`src/components/guest/otp-client-components.tsx`) which
 * already has the user.id from the verifyOtp response and cannot
 * reach into the v2 handler's AsyncLocalStorage context anyway.
 *
 * This file intentionally does NOT import from `./post-login-redirect`.
 * That module uses `Sentry.captureException` for errors because it runs
 * in the client bundle; here we log to Axiom via `ctx.fields` because
 * we're wrapped by `createAxiomRouteHandler`.
 */
export async function resolveCallbackRedirect(
  supabase: SupabaseClient<Database>,
  nextPath: string,
): Promise<string> {
  const ctx = getServerContext();

  const { data: getUserData, error: getUserError } = await supabase.auth.getUser();
  const user = getUserData?.user;

  if (getUserError || !user?.id) {
    if (ctx?.fields) {
      ctx.fields.get_user_after_callback_failed = true;
      if (getUserError) {
        ctx.fields.get_user_error_message = getUserError.message;
      }
    }
    return nextPath;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    if (ctx?.fields) {
      ctx.fields.resolve_callback_redirect_error = profileError.message;
    }
    return nextPath;
  }

  if (profile?.onboarding_complete === false) {
    return "/discover";
  }
  return nextPath;
}
