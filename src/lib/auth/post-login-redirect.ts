import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { clientLogger } from "@/lib/api-helpers/axiom-client";

/**
 * Frontend-side post-login redirect resolver. Determines where a
 * just-authenticated user should land — `/discover` for first-timers
 * (onboarding_complete === false), `nextPath` for everyone else.
 *
 * **Client-side only.** Used by the in-app OTP verify form
 * (`src/components/guest/otp-client-components.tsx`) which verifies
 * the token client-side and already has the user.id from the
 * verifyOtp response. Errors are forwarded to Axiom via
 * `clientLogger` → `/api/axiom` proxy route so the events land in the
 * same dataset as server-side telemetry.
 *
 * The API-side counterpart lives in `./resolve-callback-redirect` and
 * is used by the App Router auth callback handlers. It fetches the
 * user itself, logs errors directly to Axiom via `ctx.fields`, and
 * cannot be imported here because it pulls in `node:async_hooks`.
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
    clientLogger.warn("[resolve-post-login-redirect] profile fetch failed", {
      error: error.message,
      operation: "resolve_post_login_redirect",
      user_id: userId,
    });
    return nextPath;
  }

  if (data?.onboarding_complete === false) {
    return "/discover";
  }
  return nextPath;
}
