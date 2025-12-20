import * as Sentry from "@sentry/nextjs";

import {
	type AddCategoryToBookmarksPayload,
	type AddCategoryToBookmarksResponse,
} from "@/app/api/category/add-category-to-bookmarks/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type CategoriesData, type PaginatedBookmarks } from "@/types/apiTypes";
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
export function useAddCategoryToBookmarksMutation() {
	const { queryClient, session, queryKey, searchQueryKey } =
		useBookmarkMutationContext();

	const addCategoryToBookmarksMutation = useReactQueryOptimisticMutation<
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
				if (process.env.NODE_ENV === "development") {
					console.warn(
						`[Optimistic Update] Category ${variables.category_id} not found in cache.`,
						{
							bookmarkIds: variables.bookmark_ids,
							categoryId: variables.category_id,
						},
					);
				}

				Sentry.addBreadcrumb({
					category: "optimistic-update",
					message: "Category not found in cache (bulk operation)",
					level: "warning",
					data: {
						bookmarkIds: variables.bookmark_ids,
						categoryId: variables.category_id,
					},
				});
				return currentData;
			}

			// Create Set for O(1) lookup
			const bookmarkIdSet = new Set(variables.bookmark_ids);

			// Update all matching bookmarks across all pages
			return {
				...currentData,
				pages: currentData.pages.map((page) => ({
					...page,
					data: page.data.map((bookmark) => {
						// Skip if not in selection
						if (!bookmarkIdSet.has(bookmark.id)) {
							return bookmark;
						}

						// Check if already has category
						const existingCategories = bookmark.addedCategories ?? [];
						const alreadyHasCategory = existingCategories.some(
							(cat) => cat.id === variables.category_id,
						);

						// Skip if already has
						if (alreadyHasCategory) {
							return bookmark;
						}

						// EXCLUSIVE MODEL: When adding a real category, filter out category 0
						const isAddingRealCategory =
							variables.category_id !== UNCATEGORIZED_CATEGORY_ID;
						const filteredCategories = isAddingRealCategory
							? existingCategories.filter(
									(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
								)
							: existingCategories;

						// Add category
						return {
							...bookmark,
							addedCategories: [...filteredCategories, newCategoryEntry],
						};
					}),
				})),
			};
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

	return { addCategoryToBookmarksMutation };
}
