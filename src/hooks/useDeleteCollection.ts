import { useCallback } from "react";
import { useRouter } from "next/router";
import { isNull } from "lodash";
import find from "lodash/find";

import useDeleteCategoryOptimisticMutation from "../async/mutationHooks/category/useDeleteCategoryOptimisticMutation";
import useFetchBookmarksCount from "../async/queryHooks/bookmarks/useFetchBookmarksCount";
import useFetchCategories from "../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../async/queryHooks/user/useFetchUserProfile";
import { useSupabaseSession } from "../store/componentStore";
import { mutationApiCall } from "../utils/apiHelpers";
import { ALL_BOOKMARKS_URL } from "../utils/constants";
import { errorToast } from "../utils/toastMessages";

export const useDeleteCollection = () => {
	const router = useRouter();
	const session = useSupabaseSession((state) => state.session);

	const { allCategories } = useFetchCategories();
	const { bookmarksCountData } = useFetchBookmarksCount();
	const { userProfileData } = useFetchUserProfile();
	const { deleteCategoryOptimisticMutation } =
		useDeleteCategoryOptimisticMutation();

	const onDeleteCollection = useCallback(
		async (current: boolean, categoryId: number) => {
			if (
				!isNull(userProfileData?.data) &&
				userProfileData?.data[0]?.category_order
			) {
				const isDataPresentCheck =
					find(
						bookmarksCountData?.data?.categoryCount,
						(item) => item?.category_id === categoryId,
					)?.count === 0;

				const currentCategory = find(
					allCategories?.data,
					(item) => item?.id === categoryId,
				);

				if (currentCategory?.user_id?.id === session?.user?.id) {
					if (isDataPresentCheck) {
						await mutationApiCall(
							deleteCategoryOptimisticMutation.mutateAsync({
								category_id: categoryId,
								category_order: userProfileData?.data?.[0]?.category_order,
							}),
						);
					} else {
						errorToast(
							"This collection still has bookmarks, Please empty collection",
						);
					}
				} else {
					errorToast("Only collection owner can delete this collection");
				}

				// current - only push to home if user is deleting the category when user is currently in that category
				// isDataPresentCheck - only push to home after category get delete successfully
				if (isDataPresentCheck && current) {
					void router.push(`/${ALL_BOOKMARKS_URL}`);
				}
			}
		},
		[
			allCategories?.data,
			bookmarksCountData?.data?.categoryCount,
			deleteCategoryOptimisticMutation,
			router,
			session,
			userProfileData?.data,
		],
	);

	return { onDeleteCollection };
};
