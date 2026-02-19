import { produce } from "immer";

import {
	type AddCategoryToBookmarksPayload,
	type AddCategoryToBookmarksResponse,
} from "@/app/api/category/add-category-to-bookmarks/schema";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import {
	ADD_CATEGORY_TO_BOOKMARKS_API,
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

/**
 * Mutation hook for adding a single category to multiple bookmarks in one operation.
 * Optimistically updates all affected bookmarks in cache.
 * Used for bulk selection operations.
 */
export function useAddCategoryToBookmarksOptimisticMutation() {
	const { queryClient, session, queryKey, searchQueryKey } =
		useBookmarkMutationContext();

	const addCategoryToBookmarksOptimisticMutation =
		useReactQueryOptimisticMutation<
			AddCategoryToBookmarksResponse,
			Error,
			AddCategoryToBookmarksPayload,
			typeof queryKey,
			PaginatedBookmarks
		>({
			mutationFn: (payload) =>
				postApi<AddCategoryToBookmarksResponse>(
					`/api${ADD_CATEGORY_TO_BOOKMARKS_API}`,
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
					logCacheMiss(
						"Optimistic Update",
						"Category not found in cache (bulk operation)",
						{
							bookmarkIds: variables.bookmark_ids,
							categoryId: variables.category_id,
						},
					);
					return currentData;
				}

				// Create Set for O(1) lookup
				const bookmarkIdSet = new Set(variables.bookmark_ids);
				const isAddingRealCategory =
					variables.category_id !== UNCATEGORIZED_CATEGORY_ID;

				return produce(currentData, (draft) => {
					for (const page of draft.pages) {
						if (!page?.data) {
							continue;
						}

						for (const bookmark of page.data) {
							// Skip if not in selection
							if (!bookmarkIdSet.has(bookmark.id)) {
								continue;
							}

							// Check if already has category
							const existingCategories = bookmark.addedCategories ?? [];
							const alreadyHasCategory = existingCategories.some(
								(cat) => cat.id === variables.category_id,
							);
							if (alreadyHasCategory) {
								continue;
							}

							// EXCLUSIVE MODEL: When adding a real category, filter out category 0
							const filteredCategories = isAddingRealCategory
								? existingCategories.filter(
										(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
									)
								: existingCategories;

							bookmark.addedCategories = [
								...filteredCategories,
								newCategoryEntry,
							];
						}
					}
				});
			},
			onSettled: (_data, error) => {
				if (error) {
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
			successMessage: "Collection added to selected bookmarks",
		});

	return { addCategoryToBookmarksOptimisticMutation };
}
