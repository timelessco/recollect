import {
	type AddCategoryToBookmarkPayload,
	type AddCategoryToBookmarkResponse,
} from "@/app/api/category/add-category-to-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/useBookmarkMutationContext";
import { useReactQueryOptimisticMutation } from "@/hooks/useReactQueryOptimisticMutation";
import { postApi } from "@/lib/api-helpers/api";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import {
	ADD_CATEGORY_TO_BOOKMARK_API,
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
} from "@/utils/constants";

type AddCategoryMutationOptions = {
	skipInvalidation?: boolean;
};

/**
 * Mutation hook for adding a single category to a bookmark.
 * This is additive - it adds to existing categories without removing them.
 * Used for drag-and-drop operations.
 */
export function useAddCategoryToBookmarkMutation({
	skipInvalidation = false,
}: AddCategoryMutationOptions = {}) {
	const { queryClient, session, queryKey, searchQueryKey } =
		useBookmarkMutationContext();

	const addCategoryToBookmarkMutation = useReactQueryOptimisticMutation<
		AddCategoryToBookmarkResponse,
		Error,
		AddCategoryToBookmarkPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			postApi<AddCategoryToBookmarkResponse>(
				`/api${ADD_CATEGORY_TO_BOOKMARK_API}`,
				payload,
			),
		queryKey,
		secondaryQueryKey: searchQueryKey,
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
		successMessage: "Collection added",
	});

	return { addCategoryToBookmarkMutation };
}
