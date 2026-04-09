import { z } from "zod";

// No request body — the handler derives the user from the auth cookie
// and flips the current user's onboarding_complete to true. The endpoint
// is idempotent: calling it on an already-completed profile is a no-op.
export const MarkOnboardingCompleteInputSchema = z
  .object({})
  .meta({ description: "No body required" });

// No response body — callers fire-and-forget. Success is the HTTP 200.
export const MarkOnboardingCompleteOutputSchema = z
  .object({})
  .meta({ description: "Empty response — success is conveyed by HTTP 200" });
