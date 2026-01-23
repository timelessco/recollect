import { useQueryClient } from "@tanstack/react-query";

import { useAddPreferredOgDomainOptimisticMutation } from "@/async/mutationHooks/user/use-add-preferred-og-domain-optimistic-mutation";
import { Checkbox } from "@/components/ui/recollect/checkbox";
import { type ProfilesTableTypes } from "@/types/apiTypes";
import { USER_PROFILE } from "@/utils/constants";

type OgPreferenceCheckboxProps = {
	bookmarkUrl: string;
	userId: string;
};

const getDomain = (url: string): string | null => {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();
		return host.startsWith("www.") ? host.slice(4) : host;
	} catch {
		return null;
	}
};

export function OgPreferenceCheckbox({
	bookmarkUrl,
	userId,
}: OgPreferenceCheckboxProps) {
	const queryClient = useQueryClient();
	const { addPreferredOgDomainOptimisticMutation } =
		useAddPreferredOgDomainOptimisticMutation();

	const domain = getDomain(bookmarkUrl);

	const profileData = queryClient.getQueryData([USER_PROFILE, userId]) as
		| { data?: ProfilesTableTypes[] }
		| undefined;

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

		addPreferredOgDomainOptimisticMutation.mutate({ domain });
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
