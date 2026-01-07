import { produce } from "immer";

import {
	type SetBookmarkCategoriesPayload,
	type SetBookmarkCategoriesResponse,
} from "@/app/api/category/set-bookmark-categories/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
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
export function useSetBookmarkCategoriesOptimisticMutation({
	skipInvalidation = false,
	preserveInList = false,
}: SetBookmarkCategoriesMutationOptions = {}) {
	const { queryClient, session, queryKey, searchQueryKey, CATEGORY_ID } =
		useBookmarkMutationContext();

	const setBookmarkCategoriesOptimisticMutation =
		useReactQueryOptimisticMutation<
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
					const missingCategoryIds = finalCategoryIds.filter(
						(id) => !newCategories.some((cat) => cat.id === id),
					);
					logCacheMiss("Optimistic Update", "Categories not found in cache", {
						bookmarkId: variables.bookmark_id,
						requestedCategoryIds: finalCategoryIds,
						missingCategoryIds,
					});
					return currentData;
				}

				// Check if new categories include current collection
				const includesCurrentCollection =
					typeof CATEGORY_ID === "number" &&
					variables.category_ids.includes(CATEGORY_ID);
				const shouldRemoveFromList =
					!includesCurrentCollection && !preserveInList;

				return produce(currentData, (draft) => {
					for (const page of draft.pages) {
						if (!page?.data) {
							continue;
						}

						const bookmarkIndex = page.data.findIndex(
							(b) => b.id === variables.bookmark_id,
						);
						if (bookmarkIndex === -1) {
							continue;
						}

						// Remove bookmark from list if current collection is removed
						if (shouldRemoveFromList) {
							page.data.splice(bookmarkIndex, 1);
							return;
						}

						// Update categories
						page.data[bookmarkIndex].addedCategories = newCategories;
						return;
					}
				});
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

	return { setBookmarkCategoriesOptimisticMutation };
}
