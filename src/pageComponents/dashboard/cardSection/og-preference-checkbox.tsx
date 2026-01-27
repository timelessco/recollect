import { useQueryClient } from "@tanstack/react-query";

import { useTogglePreferredOgDomainOptimisticMutation } from "@/async/mutationHooks/user/use-toggle-preferred-og-domain-optimistic-mutation";
import { Checkbox } from "@/components/ui/recollect/checkbox";
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

	const handleCheckedChange = () => {
		if (!domain) {
			return;
		}

		togglePreferredOgDomainOptimisticMutation.mutate({ domain });
	};

	return (
		<div className="flex items-center gap-2 px-2 pb-1.5">
			{/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
			<label className="flex cursor-pointer items-center gap-2">
				<Checkbox
					checked={isPreferred}
					onCheckedChange={handleCheckedChange}
					className="flex size-4 items-center justify-center rounded border-2 border-gray-400 data-checked:border-gray-800 data-checked:bg-gray-800 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-plain data-checked:[&_svg]:text-gray-200"
				/>

				<span className="text-sm font-medium text-gray-800">OG preference</span>
			</label>
		</div>
	);
}
