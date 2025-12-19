import {
	type SetBookmarkCategoriesPayload,
	type SetBookmarkCategoriesResponse,
} from "@/app/api/category/set-bookmark-categories/route";
import { useBookmarkMutationContext } from "@/hooks/useBookmarkMutationContext";
import { useReactQueryOptimisticMutation } from "@/hooks/useReactQueryOptimisticMutation";
import { postApi } from "@/lib/api-helpers/api";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	SET_BOOKMARK_CATEGORIES_API,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

type SetBookmarkCategoriesMutationOptions = {
	skipInvalidation?: boolean;
	preserveInList?: boolean;
};

/**
 * Mutation hook for setting all categories for a bookmark.
 * Replaces existing categories with the new set.
 */
export function useSetBookmarkCategoriesMutation({
	skipInvalidation = false,
	preserveInList = false,
}: SetBookmarkCategoriesMutationOptions = {}) {
	const { queryClient, session, queryKey, searchQueryKey, CATEGORY_ID } =
		useBookmarkMutationContext();

	const setBookmarkCategoriesMutation = useReactQueryOptimisticMutation<
		SetBookmarkCategoriesResponse,
		Error,
		SetBookmarkCategoriesPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			postApi<SetBookmarkCategoriesResponse>(
				`/api${SET_BOOKMARK_CATEGORIES_API}`,
				payload,
			),
		queryKey,
		secondaryQueryKey: searchQueryKey,
		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
			}

			// Resolve categories from cache - skip optimistic update if not found
			const allCategories =
				(
					queryClient.getQueryData([CATEGORIES_KEY, session?.user?.id]) as
						| { data: CategoriesData[] }
						| undefined
				)?.data ?? [];

			// EXCLUSIVE MODEL: Filter out 0 from input (users cannot manually assign to 0)
			const nonZeroCategoryIds = variables.category_ids.filter(
				(id) => id !== UNCATEGORIZED_CATEGORY_ID,
			);

			// Determine final category IDs based on exclusive model
			// Empty = only uncategorized, Non-empty = only real categories
			const finalCategoryIds =
				nonZeroCategoryIds.length === 0
					? [UNCATEGORIZED_CATEGORY_ID]
					: nonZeroCategoryIds;

			// Filter to only categories that exist in cache
			const newCategories = finalCategoryIds
				.map((id) => allCategories.find((cat) => cat.id === id))
				.filter((cat): cat is CategoriesData => cat !== undefined);

			// If any categories weren't in cache, skip optimistic update and wait for server
			if (newCategories.length !== finalCategoryIds.length) {
				return currentData;
			}

			// Check if new categories include current collection
			const includesCurrentCollection =
				typeof CATEGORY_ID === "number" &&
				variables.category_ids.includes(CATEGORY_ID);

			// Find the page containing the bookmark, then update only that page
			for (
				let pageIndex = 0;
				pageIndex < currentData.pages.length;
				pageIndex++
			) {
				const bookmarkIndex = currentData.pages[pageIndex].data.findIndex(
					(b) => b.id === variables.bookmark_id,
				);

				if (bookmarkIndex !== -1) {
					// Found the bookmark - only clone this page
					return {
						...currentData,
						pages: currentData.pages.map((page, pageIdx) =>
							pageIdx === pageIndex
								? {
										...page,
										// Remove bookmark if current collection is removed (unless preserveInList), else update categories
										data:
											!includesCurrentCollection && !preserveInList
												? page.data.filter(
														(b) => b.id !== variables.bookmark_id,
													)
												: page.data.map((bookmark, idx) =>
														idx === bookmarkIndex
															? { ...bookmark, addedCategories: newCategories }
															: bookmark,
													),
									}
								: page,
						),
					};
				}
			}

			// Bookmark not found in any page - return unchanged
			return currentData;
		},
		onSettled: (_data, error) => {
			if (error || skipInvalidation) {
				return;
			}

			// Invalidate bookmark counts
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});

			// Invalidate ALL bookmark queries for user (covers all collections)
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id],
			});
		},
		showSuccessToast: true,
		successMessage: "Collection updated",
	});

	return { setBookmarkCategoriesMutation };
}
