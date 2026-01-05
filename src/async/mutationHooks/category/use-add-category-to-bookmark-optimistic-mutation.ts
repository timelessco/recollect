import { produce } from "immer";

import {
	type AddCategoryToBookmarkPayload,
	type AddCategoryToBookmarkResponse,
} from "@/app/api/category/add-category-to-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import {
	ADD_CATEGORY_TO_BOOKMARK_API,
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

type AddCategoryMutationOptions = {
	skipInvalidation?: boolean;
};

/**
 * Mutation hook for adding a single category to a bookmark.
 * This is additive - it adds to existing categories without removing them.
 * Used for drag-and-drop operations.
 */
export function useAddCategoryToBookmarkOptimisticMutation({
	skipInvalidation = false,
}: AddCategoryMutationOptions = {}) {
	const { queryClient, session, queryKey, searchQueryKey } =
		useBookmarkMutationContext();

	const addCategoryToBookmarkOptimisticMutation =
		useReactQueryOptimisticMutation<
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
			skipSecondaryInvalidation: skipInvalidation,

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
					logCacheMiss("Optimistic Update", "Category not found in cache", {
						bookmarkId: variables.bookmark_id,
						categoryId: variables.category_id,
					});
					return currentData;
				}

				return (
					updateBookmarkInPaginatedData(
						currentData,
						variables.bookmark_id,
						(bookmark) => {
							// Check for duplicates
							const existingCategories = bookmark.addedCategories ?? [];
							const alreadyHasCategory = existingCategories.some(
								(cat) => cat.id === variables.category_id,
							);
							if (alreadyHasCategory) {
								return;
							}

							// EXCLUSIVE MODEL: When adding a real category, filter out category 0
							const isAddingRealCategory =
								variables.category_id !== UNCATEGORIZED_CATEGORY_ID;
							const filteredCategories = isAddingRealCategory
								? existingCategories.filter(
										(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
									)
								: existingCategories;

							bookmark.addedCategories = [
								...filteredCategories,
								newCategoryEntry,
							];
						},
					) ?? currentData
				);
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

						const allCategories =
							(
								queryClient.getQueryData([
									CATEGORIES_KEY,
									session?.user?.id,
								]) as { data: CategoriesData[] } | undefined
							)?.data ?? [];
						const newCategoryEntry = allCategories.find(
							(cat) => cat.id === variables.category_id,
						);

						// If category not in cache, skip update
						if (!newCategoryEntry) {
							logCacheMiss(
								"Optimistic Update",
								"Category not found in cache (single bookmark)",
								{
									bookmarkId: variables.bookmark_id,
									categoryId: variables.category_id,
								},
							);
							return currentData;
						}

						const existingCategories = data.data[0].addedCategories ?? [];

						// Check for duplicates
						const alreadyHasCategory = existingCategories.some(
							(cat) => cat.id === variables.category_id,
						);
						if (alreadyHasCategory) {
							return currentData;
						}

						// EXCLUSIVE MODEL: Filter out uncategorized when adding real category
						const filteredCategories =
							variables.category_id !== UNCATEGORIZED_CATEGORY_ID
								? existingCategories.filter(
										(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
									)
								: existingCategories;

						return produce(data, (draft) => {
							for (const bookmark of draft.data) {
								bookmark.addedCategories = [
									...filteredCategories,
									newCategoryEntry,
								];
							}
						});
					},
				},
			],

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

	return { addCategoryToBookmarkOptimisticMutation };
}
