import { useEffect } from "react";
import isNull from "lodash/isNull";
import isEmpty from "lodash/isEmpty";

import useUpdateUserProfileOptimisticMutation from "../../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import { mutationApiCall } from "../../../utils/apiHelpers";

type UseDashboardProfileSyncParams = {
	userProfileData:
		| {
				data?: Array<{
					email?: string | null;
					provider?: string | null;
				}> | null;
		  }
		| undefined;
	session:
		| { user?: { email?: string; app_metadata?: { provider?: string } } | null }
		| undefined;
};

export function useDashboardProfileSync({
	userProfileData,
	session,
}: UseDashboardProfileSyncParams) {
	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();
	const data = userProfileData?.data;

	useEffect(() => {
		const profileData = data;
		if (
			!profileData ||
			isNull(profileData) ||
			isEmpty(profileData) ||
			session?.user?.email === profileData[0]?.email ||
			!profileData[0]?.email
		) {
			return;
		}

		void mutationApiCall(
			updateUserProfileOptimisticMutation.mutateAsync({
				updateData: { email: session?.user?.email },
			}),
		);
	}, [
		session,
		session?.user?.email,
		updateUserProfileOptimisticMutation,
		userProfileData,
		data,
	]);

	useEffect(() => {
		if (!data?.[0]?.provider && session?.user?.app_metadata?.provider) {
			void mutationApiCall(
				updateUserProfileOptimisticMutation.mutateAsync({
					updateData: { provider: session?.user?.app_metadata?.provider },
				}),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.[0]?.provider]);
}
