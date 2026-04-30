import type { TogglePreferredOgDomainOutputSchema } from "@/app/api/v2/profiles/toggle-preferred-og-domain/schema";
import type { ProfilesTableTypes } from "@/types/apiTypes";
import type { z } from "zod";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import { USER_PROFILE, V2_TOGGLE_PREFERRED_OG_DOMAIN_API } from "@/utils/constants";
import { toggleDomainInArray } from "@/utils/domain";

type TogglePreferredOgDomainResponse = z.infer<typeof TogglePreferredOgDomainOutputSchema>;

interface TogglePreferredOgDomainInput {
  domain: string;
}

export function useTogglePreferredOgDomainOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryKey = [USER_PROFILE, session?.user?.id] as const;

  const togglePreferredOgDomainOptimisticMutation = useReactQueryOptimisticMutation<
    TogglePreferredOgDomainResponse,
    Error,
    TogglePreferredOgDomainInput,
    typeof queryKey,
    ProfilesTableTypes[] | undefined
  >({
    mutationFn: async (payload) => {
      const response = await api
        .post(V2_TOGGLE_PREFERRED_OG_DOMAIN_API, {
          json: { domain: payload.domain },
        })
        .json<TogglePreferredOgDomainResponse>();
      return response;
    },
    queryKey,
    updater: (currentData, variables) => {
      if (!currentData) {
        logCacheMiss("Optimistic Update", "User profile cache missing", {
          userId: session?.user?.id,
        });
        return currentData;
      }

      const { domain } = variables;

      return currentData.map((profile) => {
        if (profile.id !== session?.user?.id) {
          return profile;
        }

        const existingDomains = profile.preferred_og_domains ?? [];

        return {
          ...profile,
          preferred_og_domains: toggleDomainInArray(existingDomains, domain),
        };
      });
    },
  });

  return { togglePreferredOgDomainOptimisticMutation };
}
