import { useCallback } from "react";
import { useRouter } from "next/router";
import find from "lodash/find";

import useDeleteCategoryOptimisticMutation from "../async/mutationHooks/category/useDeleteCategoryOptimisticMutation";
import useFetchCategories from "../async/queryHooks/category/useFetchCategories";
import { useSupabaseSession } from "../store/componentStore";
import { mutationApiCall } from "../utils/apiHelpers";
import { EVERYTHING_URL } from "../utils/constants";
import { errorToast } from "../utils/toastMessages";

export const useDeleteCollection = () => {
	const router = useRouter();
	const session = useSupabaseSession((state) => state.session);

	const { allCategories } = useFetchCategories();
	const { deleteCategoryOptimisticMutation } =
		useDeleteCategoryOptimisticMutation();

	const onDeleteCollection = useCallback(
		async (current: boolean, categoryId: number) => {
			const currentCategory = find(
				allCategories?.data,
				(item) => item?.id === categoryId,
			);

			if (currentCategory?.user_id?.id !== session?.user?.id) {
				errorToast("Only collection owner can delete this collection");
				return;
			}

			// current - only push to home if user is deleting the category when user is currently in that category
			if (current) {
				await router.replace(`/${EVERYTHING_URL}`);
			}

			await mutationApiCall(
				deleteCategoryOptimisticMutation.mutateAsync({
					category_id: categoryId,
				}),
			);
		},
		[allCategories?.data, deleteCategoryOptimisticMutation, router, session],
	);

	return { onDeleteCollection };
};
