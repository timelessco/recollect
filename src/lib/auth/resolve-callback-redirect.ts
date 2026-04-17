import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerContext } from "@/lib/api-helpers/server-context";
import { isNullable } from "@/utils/assertion-utils";

/**
 * API-side post-login redirect resolver for App Router auth callbacks.
 *
 * Fetches the just-authenticated user, reads their profile's
 * `onboarded_at` timestamp, and returns `/discover` for first-timers
 * (onboarded_at IS NULL) or `nextPath` for everyone else. Silent fallbacks
 * (getUser returning
 * nothing right after a successful auth operation, profile SELECT
 * failing) are recorded in Axiom wide events via `ctx.fields` so the
 * edge cases are searchable in production without Sentry.
 *
 * This is the sole redirect layer. There is no backstop on other
 * dashboard routes — by design, /everything and collections skip the
 * profile read for fast navigation (see commit 58acfc53). The SSR path
 * in src/pages/discover/index.tsx re-reads onboarded_at only to decide
 * whether to mount the onboarding modal on /discover itself; it does
 * not redirect first-timers who land elsewhere.
 *
 * Used by both App Router auth callback handlers: /auth/confirm
 * (magic link / email OTP) and /auth/oauth (Google / Apple sign-in).
 *
 * **API-side only.** The frontend counterpart is the
 * `useResolvePostLoginRedirect` hook in `./use-resolve-post-login-redirect`,
 * used by the client-side OTP verify form
 * (`src/components/guest/otp-client-components.tsx`) which already has
 * the user.id from the verifyOtp response and cannot reach into the v2
 * handler's AsyncLocalStorage context anyway.
 *
 * This file intentionally does NOT import from that hook. The hook runs
 * in the client bundle and forwards logs through `useLogger` →
 * `clientLogger` ProxyTransport → `/api/axiom`; here we log directly to
 * Axiom via `ctx.fields` because we're wrapped by `createAxiomRouteHandler`.
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
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    if (ctx?.fields) {
      ctx.fields.resolve_callback_redirect_error = profileError.message;
    }
    return nextPath;
  }

  if (isNullable(profile?.onboarded_at)) {
    return "/discover";
  }
  return nextPath;
}
