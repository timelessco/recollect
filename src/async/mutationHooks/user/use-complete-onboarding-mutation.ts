import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";
import { V2_COMPLETE_ONBOARDING_API } from "@/utils/constants";

interface CompleteOnboardingResponse {
  onboarding_complete: true;
}

/**
 * Fire-and-forget mutation that marks the current user's onboarding_complete
 * flag as true. Called from the welcome modal on any dismiss (Skip, backdrop,
 * CTA click). No optimistic update, no cache invalidation — the flag is read
 * once at SSR time and isn't cached in React Query.
 *
 * Idempotent on the server: calling this on an already-completed profile is
 * a harmless re-UPDATE, so duplicate calls from double-clicks or dev-mode
 * Strict-Mode remount are safe.
 */
export function useCompleteOnboardingMutation() {
  return useMutation({
    mutationKey: ["complete-onboarding"],
    // ky needs an explicit body — `parseRequestBody` on the server calls
    // `request.json()`, which throws on a zero-length POST. Sending `{}`
    // satisfies the empty `z.object({})` input schema.
    mutationFn: () =>
      api.post(V2_COMPLETE_ONBOARDING_API, { json: {} }).json<CompleteOnboardingResponse>(),
  });
}
