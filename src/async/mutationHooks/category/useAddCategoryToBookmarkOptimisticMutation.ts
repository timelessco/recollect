import { useMutation, useQueryClient } from "@tanstack/react-query";
import isNull from "lodash/isNull";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useLoadersStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { type CategoriesData } from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
} from "../../../utils/constants";
import { addCategoryToBookmark } from "../../supabaseCrudHelpers";

/**
 * @deprecated This hook uses the legacy single-category model (category_id column).
 * For the new many-to-many category system, use one of:
 * - `useSetBookmarkCategoriesMutation` - Replace all categories on a bookmark
 * - `useAddCategoryToBookmarkV2Mutation` - Add a single category (additive)
 * - `useRemoveCategoryFromBookmarkMutation` - Remove a single category
 *
 * This hook will be removed once all consumers are migrated to the new system.
 */
export default function useAddCategoryToBookmarkOptimisticMutation(
	isInvalidate: boolean = false,
) {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const { sortBy } = useGetSortBy();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const setSidePaneOptionLoading = useLoadersStore(
		(state) => state.setSidePaneOptionLoading,
	);

	const addCategoryToBookmarkOptimisticMutation = useMutation({
		mutationFn: addCategoryToBookmark,
		onMutate: async (data) => {
			setSidePaneOptionLoading(data?.category_id);

			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({
				queryKey: [CATEGORIES_KEY, session?.user?.id],
			});
			await queryClient.cancelQueries({
				queryKey: [
					BOOKMARKS_KEY,
					isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID,
				],
			});

			const previousData = queryClient.getQueryData([
				BOOKMARKS_KEY,
				isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[BOOKMARKS_KEY, isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID],
				(old: { data: CategoriesData[] } | undefined) =>
					({
						...old,

						// do not filter when user is in everything page
						data: isNull(CATEGORY_ID)
							? old?.data
							: old?.data?.filter((item) => item?.id !== data?.bookmark_id),
					}) as { data: CategoriesData[] },
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: CategoriesData }) => {
			queryClient.setQueryData(
				[BOOKMARKS_KEY, isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: async (_data, _error, variables) => {
			try {
				// Invalidate the destination collection (where the bookmark is being moved to)
				if (variables?.category_id) {
					void queryClient.invalidateQueries({
						queryKey: [
							BOOKMARKS_KEY,
							session?.user?.id,
							variables.category_id,
							sortBy,
						],
					});
				}

				if (isInvalidate) {
					void queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
					});
					void queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
					});
					// Ensure search results and any bookmark queries for this user refresh
					void queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id],
						exact: false,
					});
				}
			} finally {
				setSidePaneOptionLoading(null);
			}
		},
	});

	return { addCategoryToBookmarkOptimisticMutation };
}
