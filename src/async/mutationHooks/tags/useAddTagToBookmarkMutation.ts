import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { addTagToBookmark } from "../../supabaseCrudHelpers";

// add tag to a bookmark
export default function useAddTagToBookmarkMutation() {
	const queryClient = useQueryClient();
	const session = useSession();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const addTagToBookmarkMutation = useMutation(addTagToBookmark, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
			]);
		},
	});
	return { addTagToBookmarkMutation };
}
