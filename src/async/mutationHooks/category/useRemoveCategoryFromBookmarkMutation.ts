import {
	type RemoveCategoryFromBookmarkPayload,
	type RemoveCategoryFromBookmarkResponse,
} from "@/app/api/category/remove-category-from-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/useBookmarkMutationContext";
import { useReactQueryOptimisticMutation } from "@/hooks/useReactQueryMutation";
import { vetAxios } from "@/lib/vet-axios";
import { type PaginatedBookmarks } from "@/types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	REMOVE_CATEGORY_FROM_BOOKMARK_API,
} from "@/utils/constants";

/**
 * Mutation hook for removing a single category from a bookmark.
 * Removes only the specified category, keeping other categories intact.
 */
export function useRemoveCategoryFromBookmarkMutation() {
	const { queryClient, session, queryKey, CATEGORY_ID } =
		useBookmarkMutationContext();

	const removeCategoryFromBookmarkMutation = useReactQueryOptimisticMutation<
		RemoveCategoryFromBookmarkResponse,
		Error,
		RemoveCategoryFromBookmarkPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			vetAxios.post<RemoveCategoryFromBookmarkResponse>(
				`/api${REMOVE_CATEGORY_FROM_BOOKMARK_API}`,
				payload,
			),
		queryKey,
		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
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
														addedCategories: (b.addedCategories ?? []).filter(
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

			// Invalidate removed category if different from current
			if (variables.category_id !== CATEGORY_ID) {
				void queryClient.invalidateQueries({
					queryKey: [BOOKMARKS_KEY, session?.user?.id, variables.category_id],
				});
			}
		},
		showSuccessToast: true,
		successMessage: "Category removed",
	});

	return { removeCategoryFromBookmarkMutation };
}
