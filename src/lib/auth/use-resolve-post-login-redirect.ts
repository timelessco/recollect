"use client";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { clientLogger } from "@/lib/api-helpers/axiom-client";
import { isNullable } from "@/utils/assertion-utils";

/**
 * Frontend-side post-login redirect resolver.
 *
 * Reads the user's `onboarded_at` timestamp and returns `/discover`
 * for first-timers (onboarded_at IS NULL) or `nextPath` for everyone
 * else. Profile-fetch errors are forwarded to Axiom via `clientLogger`
 * → ProxyTransport → `/api/axiom` → server logger → Axiom dataset, so
 * they land in the same place as server-side telemetry.
 *
 * **Client-only.** Used by the in-app OTP verify form
 * (`src/components/guest/otp-client-components.tsx`) which verifies
 * the token client-side and already has the user.id from the
 * `verifyOtp` response, so this helper just needs to look up the flag.
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
    .select("onboarded_at")
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

  if (isNullable(data?.onboarded_at)) {
    return "/discover";
  }
  return nextPath;
}
