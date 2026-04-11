"use client";

import { isNullish } from "remeda";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useLogger } from "@/lib/api-helpers/axiom-client";

/**
 * Frontend-side post-login redirect resolver, as a React hook.
 *
 * Returns an async `resolve(supabase, userId, nextPath)` function that
 * reads the user's `onboarded_at` timestamp and returns `/discover`
 * for first-timers (onboarded_at IS NULL) or `nextPath` for everyone else.
 * Profile-fetch
 * errors are forwarded to Axiom via `useLogger` → `clientLogger`
 * ProxyTransport → `/api/axiom` → server logger → Axiom dataset, so
 * they land in the same place as server-side telemetry.
 *
 * **Client-only hook.** Used by the in-app OTP verify form
 * (`src/components/guest/otp-client-components.tsx`) which verifies
 * the token client-side and already has the user.id from the
 * `verifyOtp` response, so the hook just needs to look up the flag.
 *
 * The API-side counterpart lives in `./resolve-callback-redirect` and
 * is used by the App Router auth callback handlers. It fetches the
 * user itself, logs errors directly to Axiom via `ctx.fields`, and
 * cannot be imported here because it pulls in `node:async_hooks`.
 */
export function useResolvePostLoginRedirect() {
  const log = useLogger();

  return async (
    supabase: SupabaseClient<Database>,
    userId: string,
    nextPath: string,
  ): Promise<string> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      log.warn("[resolve-post-login-redirect] profile fetch failed", {
        error: error.message,
        operation: "resolve_post_login_redirect",
        user_id: userId,
      });
      return nextPath;
    }

    if (isNullish(data?.onboarded_at)) {
      return "/discover";
    }
    return nextPath;
  };
}
