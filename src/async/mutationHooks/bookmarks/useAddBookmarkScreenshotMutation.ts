// eslint-disable-next-line no-warning-comments
// todo : proper solution
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { successToast } from "../../../utils/toastMessages";
import { addBookmarkScreenshot } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useAddBookmarkScreenshotMutation() {
	const queryClient = useQueryClient();

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const session = useSupabaseSession((state) => state.session);
	const { sortBy } = useGetSortBy();

	const addBookmarkScreenshotMutation = useMutation(addBookmarkScreenshot, {
		onSuccess: () => {
			successToast("Screenshot  successfully taken");
		},
		onError: (error) => {
			successToast("Screenshot error: " + error);
		},
		onSettled: () => {
			setTimeout(() => {
				void queryClient.invalidateQueries([
					BOOKMARKS_KEY,
					session?.user?.id,
					CATEGORY_ID,
					sortBy,
				]);
			});
		},
	});

	return { addBookmarkScreenshotMutation };
}
