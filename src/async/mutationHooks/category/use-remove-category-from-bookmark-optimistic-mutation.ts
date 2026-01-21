import { produce } from "immer";

import {
	type RemoveCategoryFromBookmarkPayload,
	type RemoveCategoryFromBookmarkResponse,
} from "@/app/api/category/remove-category-from-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	REMOVE_CATEGORY_FROM_BOOKMARK_API,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

type RemoveCategoryMutationOptions = {
	skipInvalidation?: boolean;
	preserveInList?: boolean;
};

/**
 * Mutation hook for removing a single category from a bookmark.
 * Removes only the specified category, keeping other categories intact.
 */
export function useRemoveCategoryFromBookmarkOptimisticMutation({
	skipInvalidation = false,
	preserveInList = false,
}: RemoveCategoryMutationOptions = {}) {
	const { queryClient, session, queryKey, searchQueryKey, CATEGORY_ID } =
		useBookmarkMutationContext();

	const removeCategoryFromBookmarkOptimisticMutation =
		useReactQueryOptimisticMutation<
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
			skipSecondaryInvalidation: skipInvalidation,

			updater: (currentData, variables) => {
				if (!currentData?.pages) {
					return currentData as PaginatedBookmarks;
				}

				// If removing the current collection from a bookmark, remove from list
				const isRemovingCurrentCollection =
					variables.category_id === CATEGORY_ID;
				const shouldRemoveFromList =
					isRemovingCurrentCollection && !preserveInList;

				// Get uncategorized entry upfront (may be needed for exclusive model)
				const allCategories =
					(
						queryClient.getQueryData([CATEGORIES_KEY, session?.user?.id]) as
							| { data: CategoriesData[] }
							| undefined
					)?.data ?? [];
				const uncategorizedEntry = allCategories.find(
					(cat) => cat.id === UNCATEGORIZED_CATEGORY_ID,
				);

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

						// Remove bookmark from list if removing current collection
						if (shouldRemoveFromList) {
							page.data.splice(bookmarkIndex, 1);
							return;
						}

						// Update categories
						const bookmark = page.data[bookmarkIndex];
						const filteredCategories = (bookmark.addedCategories ?? []).filter(
							(cat) => cat.id !== variables.category_id,
						);

						// EXCLUSIVE MODEL: Check if any non-0 categories remain
						const hasNonZeroCategories = filteredCategories.some(
							(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
						);

						if (!hasNonZeroCategories && uncategorizedEntry) {
							bookmark.addedCategories = [uncategorizedEntry];
						} else if (!hasNonZeroCategories) {
							// Uncategorized not in cache - log warning
							logCacheMiss(
								"Optimistic Update",
								"Uncategorized category not found in cache",
								{
									bookmarkId: variables.bookmark_id,
									categoryId: variables.category_id,
								},
							);
							bookmark.addedCategories = filteredCategories;
						} else {
							bookmark.addedCategories = filteredCategories;
						}

						return;
					}
				});
			},

			// Additional optimistic update for single bookmark cache (preview route support)
			additionalOptimisticUpdates: [
				{
					getQueryKey: (variables) => [
						BOOKMARKS_KEY,
						String(variables.bookmark_id),
					],
					updater: (currentData, variables) => {
						const data = currentData as
							| { data: Array<{ addedCategories?: CategoriesData[] }> }
							| undefined;
						if (!data?.data?.[0]) {
							return currentData;
						}

						const existingCategories = data.data[0].addedCategories ?? [];
						const filteredCategories = existingCategories.filter(
							(cat) => cat.id !== variables.category_id,
						);

						// Check if any non-zero categories remain
						const hasNonZeroCategories = filteredCategories.some(
							(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
						);

						let finalCategories = filteredCategories;
						if (!hasNonZeroCategories) {
							// Get uncategorized entry from cache
							const allCategories =
								(
									queryClient.getQueryData([
										CATEGORIES_KEY,
										session?.user?.id,
									]) as { data: CategoriesData[] } | undefined
								)?.data ?? [];
							const uncategorizedEntry = allCategories.find(
								(cat) => cat.id === UNCATEGORIZED_CATEGORY_ID,
							);

							if (uncategorizedEntry) {
								finalCategories = [uncategorizedEntry];
							} else {
								logCacheMiss(
									"Optimistic Update",
									"Uncategorized category not found in cache (single bookmark)",
									{
										bookmarkId: variables.bookmark_id,
										categoryId: variables.category_id,
									},
								);
							}
						}

						return produce(data, (draft) => {
							for (const bookmark of draft.data) {
								bookmark.addedCategories = finalCategories;
							}
						});
					},
				},
			],

			onSettled: (_data, error) => {
				// Single bookmark cache is now updated optimistically via additionalOptimisticUpdates
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
			showSuccessToast: false,
		});

	return { removeCategoryFromBookmarkOptimisticMutation };
}
