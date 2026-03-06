import { useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import useGetSortBy from "@/hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "@/store/componentStore";
import { BOOKMARKS_KEY } from "@/utils/constants";

/**
 * Shared hook that provides common context for bookmark mutation hooks.
 * Extracts repeated setup code for queryClient, session, categoryId, sortBy, and queryKey.
 *
 * NOTE: This hook does NOT include invalidation logic - each mutation hook
 * handles its own invalidation dynamically based on its specific requirements.
 * @returns Object containing queryClient, session, queryKey, CATEGORY_ID, and sortBy
 */
export function useBookmarkMutationContext() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();
	const searchText = useMiscellaneousStore((state) => state.searchText);

	const queryKey = [
		BOOKMARKS_KEY,
		session?.user?.id,
		CATEGORY_ID,
		sortBy,
	] as const;

	// Only create search key if actively searching (searchText is debounced at source)
	const searchQueryKey = searchText
		? ([BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, searchText] as const)
		: null;

	return {
		queryClient,
		session,
		queryKey,
		searchQueryKey,
		CATEGORY_ID,
		sortBy,
		searchText,
	};
}
