import * as Sentry from "@sentry/nextjs";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Determine where a just-authenticated user should land.
 *
 * First-time users (onboarding_complete === false) go to /discover so the
 * welcome modal mounts via [category_id].tsx's SSR gate. Everyone else
 * goes to the requested nextPath.
 *
 * Called from every entry point that establishes a session: the OAuth and
 * email-link App Router callbacks, plus the in-app OTP verify form (which
 * bypasses /auth/confirm because Supabase verifies the token client-side).
 *
 * This is the PRIMARY detection layer. The /discover SSR gate is the
 * BACKSTOP — even if a caller misroutes a first-timer, the gate still
 * catches them on their next visit to /discover.
 */
export async function resolvePostLoginRedirect(
  supabase: SupabaseClient<Database>,
  userId: string,
  nextPath: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, {
      tags: { operation: "resolve_post_login_redirect", userId },
    });
    return nextPath;
  }

  if (data?.onboarding_complete === false) {
    return "/discover";
  }
  return nextPath;
}
