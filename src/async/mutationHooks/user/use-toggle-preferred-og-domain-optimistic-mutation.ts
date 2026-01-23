import { type AddPreferredOgDomainResponse } from "@/app/api/profiles/add-preferred-og-domain/route";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { type ProfilesTableTypes } from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import {
	ADD_PREFERRED_OG_DOMAIN_API,
	NEXT_API_URL,
	USER_PROFILE,
} from "@/utils/constants";
import { toggleDomainInArray } from "@/utils/domain";

type UserProfileCache = { data: ProfilesTableTypes[] | null; error?: Error };

type AddPreferredOgDomainInput = {
	domain: string;
};

export function useTogglePreferredOgDomainOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryKey = [USER_PROFILE, session?.user?.id] as const;

	const togglePreferredOgDomainOptimisticMutation =
		useReactQueryOptimisticMutation<
			AddPreferredOgDomainResponse,
			Error,
			AddPreferredOgDomainInput,
			typeof queryKey,
			UserProfileCache | undefined
		>({
			mutationFn: (payload) =>
				postApi<AddPreferredOgDomainResponse>(
					`${NEXT_API_URL}${ADD_PREFERRED_OG_DOMAIN_API}`,
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
			invalidates: [[USER_PROFILE, session?.user?.id]],
		});

	return { togglePreferredOgDomainOptimisticMutation };
}
