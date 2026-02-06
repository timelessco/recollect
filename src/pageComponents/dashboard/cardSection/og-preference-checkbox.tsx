import { useQueryClient } from "@tanstack/react-query";

import { useTogglePreferredOgDomainOptimisticMutation } from "@/async/mutationHooks/user/use-toggle-preferred-og-domain-optimistic-mutation";
import Switch from "@/components/switch";
import ImageIcon from "@/icons/imageIcon";
import { type ProfilesTableTypes } from "@/types/apiTypes";
import { USER_PROFILE } from "@/utils/constants";
import { getDomain } from "@/utils/domain";

type OgPreferenceCheckboxProps = {
	bookmarkUrl: string;
	userId: string;
};

export function OgPreferenceCheckbox({
	bookmarkUrl,
	userId,
}: OgPreferenceCheckboxProps) {
	const queryClient = useQueryClient();
	const { togglePreferredOgDomainOptimisticMutation } =
		useTogglePreferredOgDomainOptimisticMutation();

	const domain = getDomain(bookmarkUrl);

	type UserProfileCache = { data: ProfilesTableTypes[] | null; error?: Error };
	const profileData = queryClient.getQueryData<UserProfileCache>([
		USER_PROFILE,
		userId,
	]);

	const isPreferred = (() => {
		if (!domain) {
			return false;
		}

		const preferredDomains = profileData?.data?.[0]?.preferred_og_domains ?? [];
		return preferredDomains.some(
			(existingDomain) => existingDomain.toLowerCase() === domain.toLowerCase(),
		);
	})();

	const handleToggle = () => {
		if (!domain) {
			return;
		}

		togglePreferredOgDomainOptimisticMutation.mutate({ domain });
	};

	return (
		<div className="flex items-center justify-between gap-3 px-2 py-[7.5px]">
			<div className="flex items-center gap-2">
				<div className="flex h-4 w-4 items-center justify-center text-gray-800">
					<ImageIcon size="16" />
				</div>
				<span className="text-13 leading-4 font-450 text-gray-800">
					Use OG image for this site
				</span>
			</div>
			<div className="flex shrink-0 items-center">
				<Switch
					enabled={isPreferred}
					setEnabled={handleToggle}
					disabled={false}
					size="small"
				/>
			</div>
		</div>
	);
}
