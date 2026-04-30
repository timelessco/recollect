"use client";

/**
 * Module-level identity + session ref read by the Axiom client formatter.
 *
 * Lives outside React so non-hook emitters (`clientLogger.warn` in
 * `logCacheMiss`, `WebVitals`, `useHandleClientError`) pick up scoping
 * automatically. `ClientLoggerIdentityProvider` mounts once and writes
 * here whenever the Supabase session changes.
 *
 * SSR-safe: every `window`/`sessionStorage` access is guarded. On the
 * server, `user_id` stays `"anon"` and `session_id` stays `""` — client
 * `clientLogger` is `"use client"` so emissions never run server-side,
 * but defensive guards keep the module importable from shared utilities.
 */

const SESSION_STORAGE_KEY = "recollect.session_id";
const ANON_USER_ID = "anon";

interface Identity {
  session_id: string;
  user_id: string;
}

const identity: Identity = {
  user_id: ANON_USER_ID,
  session_id: "",
};

export function getClientIdentity(): Readonly<Identity> {
  return identity;
}

export function setClientIdentityUserId(userId: string | undefined): void {
  identity.user_id = userId ?? ANON_USER_ID;
}

/**
 * Resolve the current route for emission. `window.location.pathname`
 * is correct in both App Router and Pages Router and sidesteps the
 * need to read Next.js hooks from a non-component formatter.
 */
export function getClientRoute(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.pathname;
}

/**
 * Read-or-create the tab-scoped session id. Returns `isNew=true`
 * the first time a tab generates one — the caller uses that to emit
 * `session_start` exactly once.
 */
export function bootClientSession(): { isNew: boolean; sessionId: string } {
  if (typeof window === "undefined") {
    return { isNew: false, sessionId: "" };
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    identity.session_id = existing;
    return { isNew: false, sessionId: existing };
  }

  const sessionId = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  identity.session_id = sessionId;
  return { isNew: true, sessionId };
}
