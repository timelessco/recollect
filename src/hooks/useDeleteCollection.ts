import { useCallback } from "react";
import { useRouter } from "next/router";
import { isNull } from "lodash";
import find from "lodash/find";

import useDeleteCategoryOptimisticMutation from "../async/mutationHooks/category/useDeleteCategoryOptimisticMutation";
import useFetchCategories from "../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../async/queryHooks/user/useFetchUserProfile";
import { useSupabaseSession } from "../store/componentStore";
import { mutationApiCall } from "../utils/apiHelpers";
import { EVERYTHING_URL } from "../utils/constants";
import { errorToast } from "../utils/toastMessages";

export const useDeleteCollection = () => {
	const router = useRouter();
	const session = useSupabaseSession((state) => state.session);

	const { allCategories } = useFetchCategories();
	const { userProfileData } = useFetchUserProfile();
	const { deleteCategoryOptimisticMutation } =
		useDeleteCategoryOptimisticMutation();

	const onDeleteCollection = useCallback(
		async (current: boolean, categoryId: number) => {
			if (
				!isNull(userProfileData?.data) &&
				userProfileData?.data[0]?.category_order
			) {
				const currentCategory = find(
					allCategories?.data,
					(item) => item?.id === categoryId,
				);

				if (currentCategory?.user_id?.id !== session?.user?.id) {
					errorToast("Only collection owner can delete this collection");
					return;
				}

				await mutationApiCall(
					deleteCategoryOptimisticMutation.mutateAsync({
						category_id: categoryId,
						category_order: userProfileData?.data?.[0]?.category_order,
					}),
				);

				// current - only push to home if user is deleting the category when user is currently in that category
				if (current) {
					void router.push(`/${EVERYTHING_URL}`);
				}
			}
		},
		[
			allCategories?.data,
			deleteCategoryOptimisticMutation,
			router,
			session,
			userProfileData?.data,
		],
	);

	return { onDeleteCollection };
};
