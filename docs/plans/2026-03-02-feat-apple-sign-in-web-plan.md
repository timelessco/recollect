---
title: "feat: Add Apple Sign-In to web login page"
type: feat
status: active
date: 2026-03-02
origin: docs/brainstorms/2026-03-02-apple-sign-in-brainstorm.md
---

## feat: Add Apple Sign-In to web login page

Add "Continue with Apple" as a third OAuth sign-in option on the `/login` page. Apple is already configured in Supabase (dev + prod). This is purely a frontend integration mirroring the existing Google OAuth pattern.

## Acceptance Criteria

- [x] Apple icon component exists at `src/icons/apple-icon.tsx`
- [x] `SignInWithAppleForm` component exists in `src/components/guest/login-client-components.tsx`
- [x] Login page renders buttons in order: Email → Google → Apple
- [x] Clicking "Continue with Apple" initiates `signInWithOAuth({ provider: "apple" })` with correct `redirectTo`
- [x] Successful Apple OAuth redirects through existing `/auth/oauth` callback and lands on `/everything`
- [x] Button styling matches the existing Google button (dark bg, `rounded-lg`, `text-13`, `font-medium`)
- [x] Pending/loading state works identically to Google button
- [x] No changes to OAuth callback route, middleware, or Supabase config
- [x] `pnpm fix` passes (spelling, css, md, oxfmt, eslint)
- [x] `pnpm lint:types` passes (no new errors — pre-existing MediaPlayer/switch.tsx issues)
- [x] `pnpm lint:knip` passes (no unused exports/imports)
- [x] `pnpm build` passes

## Implementation

### 1. Create Apple icon — `src/icons/apple-icon.tsx`

Follow `src/icons/google-icon.tsx` pattern exactly:

- Named export `AppleIcon`
- Wrap in `Icon` component from `@/components/ui/recollect/icon`
- Use standard Apple logo SVG path (single path, `currentColor` fill — unlike Google's multi-color icon)
- `viewBox="0 0 16 16"` to match Google icon sizing

### 2. Add `SignInWithAppleForm` — `src/components/guest/login-client-components.tsx`

Clone `SignInWithGoogleForm` (lines 19–77) with these changes:

- Component name: `SignInWithAppleForm`
- `provider: "apple"` instead of `"google"`
- Error message: `"Failed to sign in with Apple"`
- Success toast: `"Proceeding with Apple OAuth!"`
- Icon: `<AppleIcon>` instead of `<GoogleIcon>`
- Button text: `"Continue with Apple"`

Everything else stays identical — same `callbackURL` logic, same `redirectTo` pattern, same `usePendingWithMinDuration`, same `Button` component with pending slot.

### 3. Update login page — `src/app/(guest)/(auth)/login/page.tsx`

- Import `SignInWithAppleForm` from `@/components/guest/login-client-components`
- Add `<SignInWithAppleForm />` after `<SignInWithGoogleForm />` (button order: Email → Google → Apple)

### Files changed

| File                                               | Change                                  |
| -------------------------------------------------- | --------------------------------------- |
| `src/icons/apple-icon.tsx`                         | **New** — Apple logo icon component     |
| `src/components/guest/login-client-components.tsx` | Add `SignInWithAppleForm` export        |
| `src/app/(guest)/(auth)/login/page.tsx`            | Import and render `SignInWithAppleForm` |

### Files NOT changed

| File                                  | Reason                                        |
| ------------------------------------- | --------------------------------------------- |
| `src/app/(guest)/auth/oauth/route.ts` | Already provider-agnostic                     |
| `src/lib/supabase/middleware.ts`      | Guest path detection already covers `/auth/*` |
| Supabase dashboard                    | Apple provider already enabled (dev + prod)   |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-02-apple-sign-in-brainstorm.md](../brainstorms/2026-03-02-apple-sign-in-brainstorm.md) — key decisions: button order (Email → Google → Apple), match Google button styling, reuse existing OAuth callback
- **Google OAuth template:** `src/components/guest/login-client-components.tsx:19`
- **Icon pattern:** `src/icons/google-icon.tsx:3`
- **OAuth callback:** `src/app/(guest)/auth/oauth/route.ts:8`
