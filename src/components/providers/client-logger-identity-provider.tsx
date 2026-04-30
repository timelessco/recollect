"use client";

import { useEffect } from "react";

import { emitClientEvent } from "@/lib/api-helpers/axiom-client-events";
import {
  bootClientSession,
  setClientIdentityUserId,
} from "@/lib/api-helpers/axiom-client-identity";
import { useSupabaseSession } from "@/store/componentStore";

/**
 * Router-agnostic client wide-event plumbing. Mount once per router tree
 * (App Router via `components/providers/index.tsx`, Pages Router via
 * `pages/_app.tsx`).
 *
 *   1. Boots the tab-scoped `session_id` and emits `session_start`
 *      exactly once per tab. Re-mount inside the same tab is a no-op —
 *      `bootClientSession()` returns `isNew=false` when the id is
 *      already in `sessionStorage`.
 *   2. Mirrors the Supabase session (from the zustand store that
 *      `pageComponents/dashboard/index.tsx` populates) into the client
 *      identity ref so every subsequent emission carries `user_id`.
 *
 * Route-change emission is router-specific and handled separately:
 * `AppRouterRouteChangeEmitter` below for App Router, `Router.events`
 * wiring in `pages/_app.tsx` for Pages Router.
 */
export function ClientLoggerIdentityProvider() {
  const session = useSupabaseSession((state) => state.session);

  useEffect(() => {
    const { isNew, sessionId } = bootClientSession();
    if (isNew && sessionId) {
      emitClientEvent("session_start", {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        referrer_type: document.referrer ? "external" : "direct",
        path_at_start: window.location.pathname,
      });
    }
  }, []);

  useEffect(() => {
    setClientIdentityUserId(session?.user?.id);
  }, [session?.user?.id]);

  return null;
}
