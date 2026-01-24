import { type TogglePreferredOgDomainResponse } from "@/app/api/profiles/toggle-preferred-og-domain/route";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { type ProfilesTableTypes } from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import {
	NEXT_API_URL,
	TOGGLE_PREFERRED_OG_DOMAIN_API,
	USER_PROFILE,
} from "@/utils/constants";
import { toggleDomainInArray } from "@/utils/domain";

type UserProfileCache = { data: ProfilesTableTypes[] | null; error?: Error };

type TogglePreferredOgDomainInput = {
	domain: string;
};

export function useTogglePreferredOgDomainOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryKey = [USER_PROFILE, session?.user?.id] as const;

	const togglePreferredOgDomainOptimisticMutation =
		useReactQueryOptimisticMutation<
			TogglePreferredOgDomainResponse,
			Error,
			TogglePreferredOgDomainInput,
			typeof queryKey,
			UserProfileCache | undefined
		>({
			mutationFn: (payload) =>
				postApi<TogglePreferredOgDomainResponse>(
					`${NEXT_API_URL}${TOGGLE_PREFERRED_OG_DOMAIN_API}`,
					{ domain: payload.domain },
				),
			queryKey,
			updater: (currentData, variables) => {
				if (!currentData?.data) {
					logCacheMiss("Optimistic Update", "User profile cache missing", {
						userId: session?.user?.id,
					});
					return currentData;
				}

				const { domain } = variables;

				return {
					...currentData,
					data: currentData.data.map((profile) => {
						if (profile.id !== session?.user?.id) {
							return profile;
						}

						const existingDomains = profile.preferred_og_domains ?? [];

						return {
							...profile,
							preferred_og_domains: toggleDomainInArray(
								existingDomains,
								domain,
							),
						};
					}),
				};
			},
		});

	return { togglePreferredOgDomainOptimisticMutation };
}
