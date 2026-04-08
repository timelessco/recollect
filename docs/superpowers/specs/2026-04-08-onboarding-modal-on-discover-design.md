# Onboarding modal on `/discover` — design

**Status:** draft
**Date:** 2026-04-08
**Owner:** rogerantony-dev

## Problem

The onboarding modal currently lives at its own route (`src/app/onboarding/page.tsx`). There is no mechanism to detect whether a given user has already seen it, so the route cannot be used as a "first-login welcome" without showing the same modal on every login. We also pay the JS + image cost of the modal on its own route regardless of whether the user needs it.

We want:

1. A `profiles.onboarding_complete` flag that starts `false` for new signups and gets flipped to `true` the first time the user dismisses the modal.
2. Post-login routing that sends first-timers to `/discover` automatically.
3. `/discover` (authenticated) renders the existing dashboard view with the modal overlaid on first paint for first-timers, and unchanged for everyone else.
4. `/discover` (unauthenticated) keeps showing the public `DiscoverGuestView` — the modal never runs for logged-out visitors.
5. The modal code + Remotion composition + `devices.png` are loaded dynamically — users past onboarding pay zero bytes.
6. The standalone `/onboarding` route is removed entirely.

## Non-goals

- Changing the modal content, steps, copy, or visual design.
- Migrating the Remotion vendored code upstream.
- Adding new onboarding analytics beyond the existing Sentry breadcrumbs.
- Handling users who complete onboarding on one device and open a stale session on another — the flag is one-way `false → true`, so there's no conflict worth resolving.

## Decisions (from brainstorming)

All five locked in as option A during the brainstorming session:

1. **What counts as complete:** any dismissal counts (Skip, Download Extension, Appstore, backdrop close). One unambiguous write path.
2. **Existing users:** migration backfills all pre-existing profiles to `true`. Only post-deploy signups see the modal.
3. **Read timing:** server-side in `getServerSideProps`. No flicker; the modal is in the first paint HTML.
4. **Write path:** new `POST /api/v2/profiles/complete-onboarding` v2 route, called fire-and-forget from the modal's dismiss handler.
5. **Code splitting:** full dynamic import of the modal, gated on the flag. Returning users download nothing related to onboarding.

## Architecture

```text
Browser                        Next.js                         Supabase
───────                        ───────                         ────────
 │  OAuth/Email callback        │                                │
 │  ───────────────────────▶    │                                │
 │                              │  exchangeCodeForSession / OTP  │
 │                              │  ──────────────────────────▶   │
 │                              │                                │
 │                              │  resolvePostLoginRedirect()    │
 │                              │  ──────────────────────────▶   │
 │                              │  SELECT onboarding_complete    │
 │                              │  ◀──────────────────────────   │
 │  302 → /discover (first)     │                                │
 │  ◀─────────────────────────  │                                │
 │                              │                                │
 │  GET /discover               │                                │
 │  ───────────────────────▶    │                                │
 │                              │  getServerSideProps()          │
 │                              │  SELECT onboarding_complete    │
 │                              │  ──────────────────────────▶   │
 │                              │  ◀──────────────────────────   │
 │  HTML with <Dashboard        │                                │
 │  showOnboarding=true>        │                                │
 │  ◀─────────────────────────  │                                │
 │                              │                                │
 │  hydrate → dynamic import    │                                │
 │  modal chunk + Remotion      │                                │
 │                              │                                │
 │  user dismisses modal        │                                │
 │  POST /api/v2/profiles/      │                                │
 │    complete-onboarding       │                                │
 │  ───────────────────────▶    │  UPDATE profiles SET           │
 │                              │    onboarding_complete = true  │
 │                              │  ──────────────────────────▶   │
 │                              │  ◀──────────────────────────   │
 │  200 OK (not awaited)        │                                │
 │  ◀─────────────────────────  │                                │
```

Two defense layers make sure a first-time user always sees the modal exactly once:

- **Primary:** OAuth/email callback reads the flag and routes first-timers directly to `/discover`.
- **Backstop:** `getServerSideProps` on `/discover` reads the flag independently. Even if the callback misroutes (race condition on profile-row creation, user bookmarks `/everything` directly, user clears cookies mid-session), the next visit to `/discover` still shows the modal.

The write path has one caller (the modal's `finish()` handler) and is fire-and-forget, so there is no UI gating on the network round-trip. If the write fails, Sentry captures it and the user sees the modal once more on their next `/discover` visit — the acceptable fallback for a greeting feature.

## Component-level design

### 1. Data layer

**Migration** `supabase/migrations/<timestamp>_add_onboarding_complete_to_profiles.sql`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;

-- Existing rows get `true` so current users don't see the modal on next
-- login. New inserts (post-deploy signups) inherit the column default.
UPDATE public.profiles SET onboarding_complete = true;
```

Both statements run in the same transaction — no window where existing users briefly have `false`.

**Types:** `pnpm db:reset && pnpm db:types` regenerates `src/types/database-generated.types.ts`. The `profiles` Row/Insert/Update types grow an `onboarding_complete: boolean` field, and `ProfilesTableTypes` in `src/types/apiTypes.ts` re-exports it automatically.

**RLS:** no policy changes. The existing `profiles` SELECT/UPDATE policies (user can read/update their own row via `auth.uid() = id`) already cover the new column.

**Rollback:** `ALTER TABLE public.profiles DROP COLUMN onboarding_complete;`. The column is orthogonal to everything else.

### 2. Read path — SSR gate

`src/pages/[category_id].tsx` has three existing branches in `getServerSideProps`. Only the authenticated `/discover` branch gets the new query.

**Path 1 — non-discover routes.** Unchanged logic, new `showOnboarding: false` prop for type completeness.

**Path 2 — unauthenticated `/discover`.** Unchanged logic (fetches `make_discoverable` bookmarks, returns `<DiscoverGuestView>`), new `showOnboarding: false` prop. The `if (!isAuthenticated)` early return structurally bypasses the new profile query. Component-side routing in `Home` still sends logged-out users to `<DiscoverGuestView>` before `<Dashboard>` is ever rendered. Modal never mounts.

**Path 3 — authenticated `/discover`.** One new query added between the `isAuthenticated = true` check and the existing return:

```ts
let showOnboarding = false;
const { data: profileRow, error: profileError } = await supabase
  .from("profiles")
  .select("onboarding_complete")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  Sentry.captureException(profileError, {
    tags: { route: "discover-ssr", operation: "fetch_onboarding_flag", userId: user.id },
  });
  // Fail closed: don't show the modal if we can't read the flag.
}
showOnboarding = profileRow?.onboarding_complete === false;

return {
  props: {
    discoverData: [],
    isAuthenticated: true,
    isDiscover: true,
    showOnboarding,
  },
};
```

`.maybeSingle()` is used so that a missing profile row returns `data: null` instead of an error — graceful degradation.

**Prop drilling:** `getServerSideProps` → `Home` component → `<Dashboard showOnboarding={...} />` (one hop). No context provider for a single one-way boolean.

**Component routing in `Home` stays identical:**

```tsx
if (isDiscover && !isAuthenticated && discoverData) {
  return <DiscoverGuestView discoverData={discoverData} />; // Path 2 — unchanged
}
if (!isMounted) {
  /* existing spinner */
}
return <Dashboard showOnboarding={showOnboarding} />; // Paths 1 and 3
```

### 3. Post-login redirect

Two auth callbacks exist and both need the same logic:

- `src/app/(guest)/auth/oauth/route.ts` — OAuth (Google, Apple)
- `src/app/(guest)/auth/confirm/route.ts` — email OTP, magiclink, signup confirmation

New shared helper at `src/lib/auth/post-login-redirect.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Where a just-authenticated user should land. First-time users
 * (onboarding_complete === false) go to /discover so the welcome modal
 * mounts via [category_id].tsx's SSR gate. Everyone else goes to the
 * requested nextPath (defaults to "/", which next.config.ts then redirects
 * to /everything).
 */
export async function resolvePostLoginRedirect(
  supabase: SupabaseClient,
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
```

**Callback integration:** after `exchangeCodeForSession` (OAuth) or `verifyOtp` (confirm) succeeds, read the user from the session and call the helper:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
const destination = user ? await resolvePostLoginRedirect(supabase, user.id, next) : next;
redirect(destination);
```

**Profile row timing:** the profile row is created by an existing Supabase auth trigger on `auth.users` insert (the same trigger `fetch-user-profile.ts` already relies on). By the time `exchangeCodeForSession` returns, the row exists with `onboarding_complete = false`. If the trigger ever hiccups, `.maybeSingle()` returns `data: null` and the helper falls through to `nextPath`; the `/discover` SSR gate catches the user on their next visit there.

### 4. Write path — v2 route

**New route** `src/app/api/v2/profiles/complete-onboarding/route.ts` using `createHandlerV2.postWithAuth`:

```ts
import { z } from "zod";

import { createHandlerV2 } from "@/lib/api-helpers/create-handler-v2";

const ROUTE = "complete_onboarding";

const inputSchema = z.object({}).meta({ description: "No body required" });

const outputSchema = z
  .object({
    onboarding_complete: z
      .literal(true)
      .meta({ description: "Always true after a successful write" }),
  })
  .meta({ description: "Onboarding completion confirmation" });

export const POST = createHandlerV2.postWithAuth({
  route: ROUTE,
  inputSchema,
  outputSchema,
  handler: async ({ supabase, user, error }) => {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);

    if (updateError) {
      return error({
        message: "Failed to mark onboarding complete",
        error: updateError,
        operation: "complete_onboarding",
        userId: user.id,
      });
    }

    return { onboarding_complete: true as const };
  },
});
```

**v2 contract:** bare response on success (`{ onboarding_complete: true }`), `{ error: string }` with status on failure. OpenAPI spec picks up the Zod schemas via `pnpm prebuild:next`.

**Idempotency:** hitting the endpoint after completion is a harmless re-UPDATE. Matters because fire-and-forget + double-clicks + Strict-Mode remount could trigger duplicate calls.

**Constant in `src/utils/constants.ts`:**

```ts
export const COMPLETE_ONBOARDING_API = "v2/profiles/complete-onboarding";
```

v2 constants have no leading slash per the existing convention.

**Mutation hook** `src/async/mutationHooks/user/use-complete-onboarding.ts`:

```ts
import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";
import { COMPLETE_ONBOARDING_API } from "@/utils/constants";

interface CompleteOnboardingResponse {
  onboarding_complete: true;
}

export function useCompleteOnboarding() {
  return useMutation({
    mutationKey: ["complete-onboarding"],
    mutationFn: async () => {
      return await api.post(COMPLETE_ONBOARDING_API).json<CompleteOnboardingResponse>();
    },
  });
}
```

No optimistic update and no cache invalidation — the flag is read once at SSR time and isn't cached in React Query. The modal unmounts on dismiss anyway.

### 5. Mount point + dynamic import

`src/pageComponents/dashboard/index.tsx` gets one new optional prop and a dynamic import:

```tsx
import dynamic from "next/dynamic";

// @remotion/player touches `window` on import — ssr: false is required.
// The whole onboarding modal tree (modal + Remotion composition + icons)
// sits behind this one split point.
const OnboardingModal = dynamic(
  () =>
    import("@/pageComponents/onboarding/onboarding-modal").then((m) => ({
      default: m.OnboardingModal,
    })),
  { ssr: false },
);

interface DashboardProps {
  showOnboarding?: boolean;
}

export default function Dashboard({ showOnboarding = false }: DashboardProps) {
  // ... existing dashboard tree ...
  return (
    <>
      {/* existing dashboard JSX */}
      {showOnboarding ? <OnboardingModal /> : null}
    </>
  );
}
```

`pages/[category_id].tsx` passes `showOnboarding={isDiscover ? props.showOnboarding : false}` — belt-and-suspenders even if SSR ever sends `true` on a non-discover route.

**Two-level split:** the outer `dynamic()` in `Dashboard` gates the whole modal tree on `showOnboarding`. The inner `dynamic()` already inside `onboarding-modal.tsx` gates the Remotion player on `step === "extension"`. Step 2 (`AppsStep`) never pulls the player chunk.

**Asset loading behavior after split:**

| Scenario                           | JS chunks                                         | Images                    |
| ---------------------------------- | ------------------------------------------------- | ------------------------- |
| Returning user on `/discover`      | Dashboard only                                    | None from `/onboarding/`  |
| First-timer on `/discover`, step 1 | Dashboard + modal + Remotion player + composition | `chrome.svg` only         |
| First-timer clicks Skip → step 2   | Player chunk stays loaded but idle                | `devices.png` fetched now |
| Any user on any non-discover route | Dashboard only                                    | None                      |

**One tweak to `onboarding-modal.tsx`:** drop `priority` from the `<Image src="/onboarding/devices.png">` prop. It made sense when the modal was its own full route; as a split-loaded overlay, `priority` would try to preload the image in the parent route's `<head>`, defeating the split.

### 6. Modal dismiss handler

Question 1's answer was "any dismissal counts — Skip on step 1, Skip on step 2, Download Extension click, Appstore click, or clicking the backdrop." This is implemented as a single `markComplete()` call-site that runs on **every** user interaction with the modal, gated by a ref so the mutation fires exactly once per modal session regardless of how many interactions occur.

Inside `src/pageComponents/onboarding/onboarding-modal.tsx`:

```tsx
import { useRef } from "react";
import * as Sentry from "@sentry/nextjs";

import { useCompleteOnboarding } from "@/async/mutationHooks/user/use-complete-onboarding";

// inside OnboardingModal component
const completeOnboarding = useCompleteOnboarding();
const hasMarkedRef = useRef(false);

// Fire-and-forget completion write. Idempotent on the server (UPDATE to a
// row already at `true` is a no-op), but we also gate client-side so we
// don't issue duplicate network requests within one session.
const markComplete = () => {
  if (hasMarkedRef.current) return;
  hasMarkedRef.current = true;
  completeOnboarding.mutate(undefined, {
    onError: (err) => {
      Sentry.addBreadcrumb({
        category: "onboarding",
        message: "Failed to mark onboarding complete from client",
        level: "warning",
        data: { error: String(err) },
      });
    },
  });
};

// Skip advances through the step machine and, on the final step, closes
// the modal. markComplete() runs on every Skip press — first press already
// writes the flag, subsequent presses hit the ref guard and no-op.
const skip = () => {
  markComplete();
  const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
  if (next) {
    setStep(next);
    return;
  }
  setOpen(false);
};

// Dialog.Root onOpenChange — fires on backdrop click, Esc key, X button.
const handleOpenChange = (nextOpen: boolean) => {
  if (!nextOpen) {
    markComplete();
    setOpen(false);
  }
};
```

**CTA buttons** (`Download Extension`, `Appstore`) each get an `onClick={markComplete}`. The Appstore link is an external `<a target="_blank">`, so the click fires `markComplete` synchronously before the new-tab navigation begins — no race. The Download Extension button currently has no side-effect; we just add the `markComplete` handler and leave any future "open Chrome Web Store" wiring out of scope.

**Removed behavior:** the current `finish()` calls `router.push("/everything")` because the modal lives on its own route and needs to take the user somewhere. In the new design the modal is **on** `/discover`, so closing should just close — no navigation. The `useRouter` import and the `router.push` call are removed from the file.

### 7. Cleanup

**Files to delete:**

- `src/app/onboarding/page.tsx`
- `src/app/onboarding/` directory

**`src/utils/constants.ts` — remove `/onboarding` from `PUBLIC_PATHS`:**

```ts
const PUBLIC_PATHS = ["/api-docs", "/discover", "/error", "/openapi.json", "/public"] as const;
```

`/discover` stays in the list so the proxy middleware still lets unauth users reach `<DiscoverGuestView>`.

**`src/pageComponents/onboarding/onboarding-modal.tsx`:**

- Drop the `useRouter` import and the `router.push("/everything")` call from `finish()`
- Add `useCompleteOnboarding()` + `hasMarkedRef` + `markComplete()` helper per Section 6
- Update `skip()` to call `markComplete()` before the step-advance / close logic
- Change `Dialog.Root`'s `onOpenChange` to call `markComplete()` before `setOpen(false)`
- Add `onClick={markComplete}` to the Download Extension and Appstore CTA buttons
- Drop `priority` from the `<Image src="/onboarding/devices.png">` prop

Nothing else in the file changes. The step state machine, the two step components, the Skip button position, and the layout math all stay as-is.

## Edge cases

- **Profile row missing at callback time** (auth trigger race). `.maybeSingle()` returns `data: null`, helper returns `nextPath`, user lands on `/everything`. The next visit to `/discover` re-checks the flag and shows the modal (the row exists by then). Graceful.
- **Profile read error at SSR time.** Sentry captures the exception, `showOnboarding` stays `false`, user sees `/discover` without the modal. Fail-closed is correct — better to miss showing the modal than to crash the dashboard.
- **User dismisses, write fails, user reloads.** Modal appears again on next `/discover` visit. One-time friction but no corruption.
- **User dismisses twice (double click, dev-mode Strict-Mode remount).** The UPDATE is idempotent; second call is a no-op on the DB side.
- **User completes onboarding on device A, opens stale session on device B.** Device B's next `getServerSideProps` read returns `true` from the now-updated row. Modal doesn't appear. No conflict.
- **Unauth user visits `/discover`.** Unaffected. No profile query, no modal chunk, no image requests. Same HTML as today.
- **First-timer visits `/everything` directly** (e.g. from a bookmark that bypasses the OAuth callback). They don't see the modal on `/everything` (Path 1 gates on `isDiscover`). They see it the moment they navigate to `/discover`. Acceptable — the modal is a welcome overlay, not a blocker.

## Testing and verification

1. `pnpm db:reset && pnpm db:types` regenerates types; `ProfilesTableTypes` includes `onboarding_complete: boolean`.
2. `pnpm fix:ultracite` — 0 errors.
3. `pnpm build` — clean; route manifest shows **no** `/onboarding` entry.
4. Manual: log out, create a fresh account via Google OAuth → lands on `/discover` with modal visible in first paint (no flicker).
5. Manual: dismiss modal end-to-end (Skip → Skip) → browser devtools Network tab shows `POST /api/v2/profiles/complete-onboarding` succeeded.
6. Manual: reload `/discover` → modal gone.
7. Manual: `UPDATE profiles SET onboarding_complete = false WHERE id = '...'`, reload `/discover` → modal visible again. (Confirms the read path.)
8. Manual: log out, visit `/discover` as unauth user → discover grid renders, no modal. Network tab: zero onboarding-related chunks or images.
9. Manual: existing (pre-migration backfill) user logs in → goes straight to `/everything` via root redirect, never sees modal.
10. DevTools on `/everything` for any user: no `devices.png`, no Remotion player chunk, no modal JS chunk.
11. DevTools on `/discover` for returning user: same — no onboarding chunks.
12. DevTools on `/discover` for first-timer: modal chunk + Remotion player chunk + `chrome.svg` fetched; `devices.png` only after clicking Skip to reach step 2.
13. Unauth `/discover`: byte-for-byte identical to today.
14. Auth returning-user `/discover`: `<Dashboard>` renders with discover active; SSR adds one cheap profile column lookup, no visible difference.
15. Auth first-timer `/discover`: modal in first paint; fire-and-forget write on dismiss; reload shows no modal.
16. Auth first-timer on non-discover route: no modal, no profile query, no chunks. Modal only appears when they reach `/discover`.

## Out of scope

- Analytics events on modal interactions beyond the existing Sentry breadcrumbs.
- A "reset onboarding" admin control (can be added later if needed via the existing profile update routes).
- A forced-onboarding-even-for-existing-users flag (the migration backfill is intentional — re-running the backfill with `false` would reset everyone).
- Remotion upstream sync workflow changes (tracked separately).

## Open questions

None — all five brainstorming questions were resolved as option A. Implementation plan comes next.
