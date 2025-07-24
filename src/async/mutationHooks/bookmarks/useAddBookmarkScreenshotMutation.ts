import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useLoadersStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { successToast } from "../../../utils/toastMessages";
import { addBookmarkScreenshot } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useAddBookmarkScreenshotMutation(bookmarkId?: number) {
	const queryClient = useQueryClient();

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const session = useSupabaseSession((state) => state.session);
	const { sortBy } = useGetSortBy();
	const { addLoadingBookmarkId, removeLoadingBookmarkId } = useLoadersStore();

	const addBookmarkScreenshotMutation = useMutation(addBookmarkScreenshot, {
		onMutate: async () => {
			if (bookmarkId) {
				addLoadingBookmarkId(bookmarkId);
			}
		},
		onSuccess: () => {
			successToast("Screenshot successfully taken ^_^");
		},
		onError: (error) => {
			successToast("Screenshot error: " + error);
		},
		onSettled: () => {
			if (bookmarkId) {
				removeLoadingBookmarkId(bookmarkId);
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
