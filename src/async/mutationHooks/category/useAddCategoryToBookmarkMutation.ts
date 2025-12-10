import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
} from "../../../utils/constants";
import { addCategoryToBookmark } from "../../supabaseCrudHelpers";

import useDebounce from "@/hooks/useDebounce";

// add category to bookmark un-optimistically , used when creating a new category when editing a bookmark
export default function useAddCategoryToBookmarkMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	const addCategoryToBookmarkMutation = useMutation({
		mutationFn: addCategoryToBookmark,
		onMutate: () => ({ debouncedSearch }),
		onSuccess: (
			_data,
			_variables,
			context: { debouncedSearch: string } | undefined,
		) => {
			// Invalidate and refetch
			void queryClient.invalidateQueries({
				queryKey: [CATEGORIES_KEY, session?.user?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});
			// Use captured debouncedSearch from context to avoid stale closure
			if (context?.debouncedSearch) {
				void queryClient.invalidateQueries({
					queryKey: [
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						context.debouncedSearch,
					],
				});
			}
		},
	});

	return { addCategoryToBookmarkMutation };
}
