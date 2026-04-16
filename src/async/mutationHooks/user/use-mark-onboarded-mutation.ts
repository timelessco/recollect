import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";
import { V2_MARK_ONBOARDED_API } from "@/utils/constants";

/**
 * Fire-and-forget mutation that records the current user's onboarding
 * completion timestamp. Called from the welcome modal on any dismiss (Skip,
 * backdrop, CTA click). No optimistic update, no cache invalidation — the
 * timestamp is read once at SSR time and isn't cached in React Query.
 *
 * Idempotent on the server: re-calls after the first are no-ops because the
 * server filters `.is('onboarded_at', null)` — the original timestamp is
 * preserved. Duplicate calls from double-clicks or dev-mode Strict-Mode
 * remount are safe.
 */
export function useMarkOnboardedMutation() {
  return useMutation({
    mutationKey: ["mark-onboarded"],
    // ky needs an explicit body — `parseRequestBody` on the server calls
    // `request.json()`, which throws on a zero-length request. Sending `{}`
    // satisfies the empty `z.object({})` input schema.
    mutationFn: () => api.patch(V2_MARK_ONBOARDED_API, { json: {} }),
  });
}
