import find from "lodash/find";

import useAddBookmarkMinDataOptimisticMutation from "../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useFetchCategories from "../async/queryHooks/category/useFetchCategories";
import { useSupabaseSession } from "../store/componentStore";
import { mutationApiCall } from "../utils/apiHelpers";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

export function useAddBookmark() {
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { allCategories } = useFetchCategories();

	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();

	const onAddBookmark = (url: string) => {
		const hasProtocol =
			url?.startsWith("http://") || url?.startsWith("https://");
		const finalUrl = hasProtocol ? url : `https://${url}`;

		const currentCategory = find(
			allCategories?.data,
			(item) => item?.id === CATEGORY_ID,
		);

		const updateAccessCondition =
			typeof CATEGORY_ID === "number"
				? find(
						currentCategory?.collabData,
						(item) => item?.userEmail === session?.user?.email,
					)?.edit_access === true ||
					currentCategory?.user_id?.id === session?.user?.id
				: true;

		void mutationApiCall(
			addBookmarkMinDataOptimisticMutation.mutateAsync({
				url: finalUrl,
				category_id: CATEGORY_ID,
				update_access: updateAccessCondition,
			}),
		);
	};

	return { onAddBookmark };
}
