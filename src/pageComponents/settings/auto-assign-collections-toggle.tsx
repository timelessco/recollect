import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import { AutoAssignCollectionIcon } from "../../icons/auto-assign-collection-icon";

import { SettingsToggleCard } from "./settingsToggleCard";

const AUTO_ASSIGN_TITLE = "Auto assign a collection to bookmarks";
const AUTO_ASSIGN_DESCRIPTION = "Automatically assign bookmarks to collections";

export function AutoAssignCollectionsToggle() {
	return (
		<div className="pt-10">
			<p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">
				Features
			</p>
			<AutoAssignCollectionsSwitch />
		</div>
	);
}

function AutoAssignCollectionsSwitch() {
	const { userProfileData, isLoading } = useFetchUserProfile();
	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();

	const userData = userProfileData?.data?.[0];
	const aiFeatures = userData?.ai_features_toggle;
	const enabled = aiFeatures?.auto_assign_collections;

	const handleToggle = () => {
		updateUserProfileOptimisticMutation.mutate({
			updateData: {
				ai_features_toggle: {
					...aiFeatures,
					auto_assign_collections: !enabled,
				},
			},
		});
	};

	return (
		<SettingsToggleCard
			icon={
				<figure className="text-gray-900">
					<AutoAssignCollectionIcon className="h-5.5 w-5.5 text-gray-900" />
				</figure>
			}
			title={AUTO_ASSIGN_TITLE}
			description={AUTO_ASSIGN_DESCRIPTION}
			isSwitch
			enabled={isLoading ? false : enabled}
			onToggle={isLoading ? undefined : handleToggle}
		/>
	);
}
