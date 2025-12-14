import {
	type RemoveCategoryFromBookmarkPayload,
	type RemoveCategoryFromBookmarkResponse,
} from "@/app/api/category/remove-category-from-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/useBookmarkMutationContext";
import { useReactQueryOptimisticMutation } from "@/hooks/useReactQueryMutation";
import { postApi } from "@/lib/api-helpers/api";
import { type PaginatedBookmarks } from "@/types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	REMOVE_CATEGORY_FROM_BOOKMARK_API,
} from "@/utils/constants";

type RemoveCategoryMutationOptions = {
	skipInvalidation?: boolean;
	preserveInList?: boolean;
};

/**
 * Mutation hook for removing a single category from a bookmark.
 * Removes only the specified category, keeping other categories intact.
 */
export function useRemoveCategoryFromBookmarkMutation({
	skipInvalidation = false,
	preserveInList = false,
}: RemoveCategoryMutationOptions = {}) {
	const { queryClient, session, queryKey, searchQueryKey, CATEGORY_ID } =
		useBookmarkMutationContext();

	const removeCategoryFromBookmarkMutation = useReactQueryOptimisticMutation<
		RemoveCategoryFromBookmarkResponse,
		Error,
		RemoveCategoryFromBookmarkPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			postApi<RemoveCategoryFromBookmarkResponse>(
				`/api${REMOVE_CATEGORY_FROM_BOOKMARK_API}`,
				payload,
			),
		queryKey,
		secondaryQueryKey: searchQueryKey,
		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
			}

			// If removing the current collection from a bookmark, remove from list
			const isRemovingCurrentCollection = variables.category_id === CATEGORY_ID;

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
										// Remove bookmark when removing current collection (unless preserveInList), else update addedCategories
										data:
											isRemovingCurrentCollection && !preserveInList
												? page.data.filter(
														(b) => b.id !== variables.bookmark_id,
													)
												: page.data.map((b, idx) =>
														idx === bookmarkIndex
															? {
																	...b,
																	addedCategories: (
																		b.addedCategories ?? []
																	).filter(
																		(cat) => cat.id !== variables.category_id,
																	),
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
		successMessage: "Collection removed",
	});

	return { removeCategoryFromBookmarkMutation };
}
