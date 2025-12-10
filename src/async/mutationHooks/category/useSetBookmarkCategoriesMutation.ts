import {
	type SetBookmarkCategoriesPayload,
	type SetBookmarkCategoriesResponse,
} from "@/app/api/category/set-bookmark-categories/route";
import { useBookmarkMutationContext } from "@/hooks/useBookmarkMutationContext";
import { useReactQueryOptimisticMutation } from "@/hooks/useReactQueryMutation";
import { vetAxios } from "@/lib/vet-axios";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	SET_BOOKMARK_CATEGORIES_API,
} from "@/utils/constants";

/**
 * Mutation hook for setting all categories for a bookmark.
 * Replaces existing categories with the new set.
 */
export function useSetBookmarkCategoriesMutation() {
	const { queryClient, session, queryKey, CATEGORY_ID } =
		useBookmarkMutationContext();

	const setBookmarkCategoriesMutation = useReactQueryOptimisticMutation<
		SetBookmarkCategoriesResponse,
		Error,
		SetBookmarkCategoriesPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			vetAxios.post<SetBookmarkCategoriesResponse>(
				`/api${SET_BOOKMARK_CATEGORIES_API}`,
				payload,
			),
		queryKey,
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

			// Filter to only categories that exist in cache
			const newCategories = variables.category_ids
				.map((id) => allCategories.find((cat) => cat.id === id))
				.filter((cat): cat is CategoriesData => cat !== undefined);

			// If any categories weren't in cache, skip optimistic update and wait for server
			if (newCategories.length !== variables.category_ids.length) {
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
					// Found the bookmark - only clone this page
					return {
						...currentData,
						pages: currentData.pages.map((page, pageIdx) =>
							pageIdx === pageIndex
								? {
										...page,
										data: page.data.map((bookmark, idx) =>
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

			// Invalidate all target categories that differ from current
			for (const categoryId of variables.category_ids) {
				if (categoryId !== CATEGORY_ID) {
					void queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id, categoryId],
					});
				}
			}
		},
		showSuccessToast: true,
		successMessage: "Categories updated",
	});

	return { setBookmarkCategoriesMutation };
}
