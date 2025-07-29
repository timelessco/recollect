import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useLoadersStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { addBookmarkScreenshot } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useAddBookmarkScreenshotMutation() {
	const queryClient = useQueryClient();

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const session = useSupabaseSession((state) => state.session);
	const { sortBy } = useGetSortBy();
	const { removeLoadingBookmarkId } = useLoadersStore();

	const addBookmarkScreenshotMutation = useMutation(addBookmarkScreenshot, {
		onSuccess: () => {
			successToast("Screenshot successfully taken");
		},
		onError: (error) => {
			errorToast("Screenshot error: " + error);
		},
		onSettled: (apiResponse: unknown) => {
			const response = apiResponse as { data: { data: SingleListData[] } };
			if (response?.data?.data[0]?.id) {
				removeLoadingBookmarkId(response?.data?.data[0]?.id);
			}

			void queryClient.invalidateQueries([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);
		},
	});

	return { addBookmarkScreenshotMutation };
}
