# Apple Sign-In Web Integration

**Date**: 2026-03-02
**Status**: Ready for planning

## What We're Building

Add "Continue with Apple" as a third sign-in option on the Recollect web login page. Apple Sign-In is already configured in Supabase (both dev and prod environments) for the mobile app. This task integrates the same provider into the Next.js web frontend.

## Why This Approach

The existing Google OAuth implementation provides an exact template. Supabase's `signInWithOAuth` API is provider-agnostic — changing `provider: "google"` to `provider: "apple"` is the core of it. The OAuth callback route (`/auth/oauth`) already handles any provider's code exchange. No backend, middleware, or Supabase dashboard changes required.

## Key Decisions

| Decision        | Choice                       | Rationale                                                                                                     |
| --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Button order    | Email → Google → Apple       | Apple added at the bottom of the existing stack                                                               |
| Button styling  | Match Google button pattern  | Consistent UI — same dark bg, rounded-lg, text-13, font-medium. Custom Apple icon instead of Apple HIG button |
| OAuth callback  | Reuse existing `/auth/oauth` | Route is provider-agnostic, handles code exchange for any provider                                            |
| Middleware      | No changes                   | Guest path detection already covers `/auth/*`                                                                 |
| Supabase config | Already done                 | Apple provider enabled in both dev and prod dashboards                                                        |

## Scope

### In scope

- `SignInWithAppleForm` client component (mirrors `SignInWithGoogleForm`)
- Apple icon SVG component
- Add to login page (`/login`)

### Out of scope

- Apple Developer Console setup (already done)
- Supabase dashboard configuration (already done)
- Mobile app changes
- Native Sign in with Apple JS SDK (using Supabase OAuth redirect flow instead)

## Resolved Questions

- **Apple credentials needed?** No — already configured in Supabase by mobile dev team
- **Apple HIG compliance?** Opting for visual consistency with existing buttons over strict Apple branding guidelines
- **Callback route changes?** None — existing route is provider-agnostic
