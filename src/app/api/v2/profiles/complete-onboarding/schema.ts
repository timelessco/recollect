import { z } from "zod";

// No request body — the handler derives the user from the auth cookie
// and flips the current user's onboarding_complete to true. The endpoint
// is idempotent: calling it on an already-completed profile is a no-op.
export const CompleteOnboardingInputSchema = z.object({}).meta({ description: "No body required" });

export const CompleteOnboardingOutputSchema = z
  .object({
    onboarding_complete: z
      .literal(true)
      .meta({ description: "Always true after a successful write" }),
  })
  .meta({ description: "Onboarding completion confirmation" });
