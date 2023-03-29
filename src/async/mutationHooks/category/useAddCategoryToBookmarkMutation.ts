import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
} from "../../../utils/constants";
import { addCategoryToBookmark } from "../../supabaseCrudHelpers";

// add category to bookmark un-optimistically , used when creating a new category when editing a bookmark
export default function useAddCategoryToBookmarkMutation() {
	const session = useSession();
	const queryClient = useQueryClient();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const addCategoryToBookmarkMutation = useMutation(addCategoryToBookmark, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
			void queryClient.invalidateQueries([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
			]);
			void queryClient.invalidateQueries([
				BOOKMARKS_COUNT_KEY,
				session?.user?.id,
			]);
		},
	});

	return { addCategoryToBookmarkMutation };
}
