import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ProfilesTableTypes } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { USER_PROFILE, V2_MARK_ONBOARDED_API } from "@/utils/constants";

/**
 * Fire-and-forget mutation that records the current user's onboarding
 * completion timestamp. Called from the welcome modal on any dismiss (Skip,
 * backdrop, CTA click).
 *
 * Idempotent on the server: re-calls after the first are no-ops because the
 * server filters `.is('onboarded_at', null)` — the original timestamp is
 * preserved. Duplicate calls from double-clicks or dev-mode Strict-Mode
 * remount are safe.
 *
 * On success, patches the cached user profile so the `showOnboarding`
 * derivation in Dashboard flips to false without waiting for a refetch.
 */
export function useMarkOnboardedMutation() {
  const queryClient = useQueryClient();
  const userId = useSupabaseSession((state) => state.session?.user?.id);

  return useMutation({
    mutationKey: ["mark-onboarded"],
    // ky needs an explicit body — `parseRequestBody` on the server calls
    // `request.json()`, which throws on a zero-length request. Sending `{}`
    // satisfies the empty `z.object({})` input schema.
    mutationFn: () => api.patch(V2_MARK_ONBOARDED_API, { json: {} }),
    onSuccess: () => {
      if (!userId) {
        return;
      }
      const now = new Date().toISOString();
      queryClient.setQueryData<ProfilesTableTypes[]>([USER_PROFILE, userId], (previous) =>
        previous?.map((profile) =>
          profile.onboarded_at === null ? { ...profile, onboarded_at: now } : profile,
        ),
      );
    },
  });
}
