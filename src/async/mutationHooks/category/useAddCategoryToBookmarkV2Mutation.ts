import {
	type AddCategoryToBookmarkV2Payload,
	type AddCategoryToBookmarkV2Response,
} from "@/app/api/category/add-category-to-bookmark-v2/route";
import { useBookmarkMutationContext } from "@/hooks/useBookmarkMutationContext";
import { useReactQueryOptimisticMutation } from "@/hooks/useReactQueryMutation";
import { vetAxios } from "@/lib/vet-axios";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import {
	ADD_CATEGORY_TO_BOOKMARK_V2_API,
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
} from "@/utils/constants";

/**
 * Mutation hook for adding a single category to a bookmark.
 * This is additive - it adds to existing categories without removing them.
 * Used for drag-and-drop operations.
 */
export function useAddCategoryToBookmarkV2Mutation() {
	const { queryClient, session, queryKey, CATEGORY_ID } =
		useBookmarkMutationContext();

	const addCategoryToBookmarkV2Mutation = useReactQueryOptimisticMutation<
		AddCategoryToBookmarkV2Response,
		Error,
		AddCategoryToBookmarkV2Payload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			vetAxios.post<AddCategoryToBookmarkV2Response>(
				`/api${ADD_CATEGORY_TO_BOOKMARK_V2_API}`,
				payload,
			),
		queryKey,
		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
			}

			// Resolve category from cache - skip optimistic update if not found
			const allCategories =
				(
					queryClient.getQueryData([CATEGORIES_KEY, session?.user?.id]) as
						| { data: CategoriesData[] }
						| undefined
				)?.data ?? [];
			const newCategoryEntry = allCategories.find(
				(cat) => cat.id === variables.category_id,
			);

			// If category not in cache, skip optimistic update and wait for server response
			if (!newCategoryEntry) {
				return currentData;
			}

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
					const bookmark = currentData.pages[pageIndex].data[bookmarkIndex];

					// Check for duplicates
					const existingCategories = bookmark.addedCategories ?? [];
					const alreadyHasCategory = existingCategories.some(
						(cat) => cat.id === variables.category_id,
					);

					// If already has category, return unchanged
					if (alreadyHasCategory) {
						return currentData;
					}

					// Found the bookmark - only clone this page
					return {
						...currentData,
						pages: currentData.pages.map((page, pageIdx) =>
							pageIdx === pageIndex
								? {
										...page,
										data: page.data.map((b, idx) =>
											idx === bookmarkIndex
												? {
														...b,
														addedCategories: [
															...existingCategories,
															newCategoryEntry,
														],
													}
												: b,
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
		onSettled: (_data, error, variables) => {
			if (error) {
				return;
			}

			// Always invalidate bookmark counts
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});

			// Invalidate current category view
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID],
			});

			// Invalidate target category if different from current
			if (variables.category_id !== CATEGORY_ID) {
				void queryClient.invalidateQueries({
					queryKey: [BOOKMARKS_KEY, session?.user?.id, variables.category_id],
				});
			}
		},
		showSuccessToast: true,
		successMessage: "Category added",
	});

	return { addCategoryToBookmarkV2Mutation };
}
