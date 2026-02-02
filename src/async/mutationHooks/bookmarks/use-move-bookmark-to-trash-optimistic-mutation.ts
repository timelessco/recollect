import { produce } from "immer";

import { moveBookmarkToTrash } from "../../supabaseCrudHelpers";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import {
	type MoveBookmarkToTrashApiPayload,
	type PaginatedBookmarks,
} from "@/types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	TRASH_URL,
	UNCATEGORIZED_URL,
} from "@/utils/constants";

/**
 * Mutation hook for moving bookmarks to/from trash with optimistic updates.
 * Handles:
 * - Removing bookmark from source page (current category or trash)
 * - Adding bookmark to destination page (trash or category)
 * - Proper invalidation of all affected caches including trash page with sortBy
 */
export const useMoveBookmarkToTrashOptimisticMutation = () => {
	const { queryClient, session, queryKey, searchQueryKey, sortBy } =
		useBookmarkMutationContext();

	const moveBookmarkToTrashOptimisticMutation = useReactQueryOptimisticMutation<
		unknown,
		Error,
		MoveBookmarkToTrashApiPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: moveBookmarkToTrash,
		queryKey,
		secondaryQueryKey: searchQueryKey,

		// Remove bookmark from source page (current category or trash)
		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
			}

			// Remove the bookmark from the current page
			return produce(currentData, (draft) => {
				for (const page of draft.pages) {
					if (!page?.data) {
						continue;
					}

					page.data = page.data.filter(
						(bookmark) => bookmark.id !== variables.data.id,
					);
				}
			});
		},

		// Add to trash page when moving TO trash, or add to category when restoring FROM trash
		additionalOptimisticUpdates: [
			{
				// Get the destination query key based on operation
				getQueryKey: (variables) => {
					if (variables.isTrash) {
						// Moving TO trash - update trash page
						return [BOOKMARKS_KEY, session?.user?.id, TRASH_URL, sortBy];
					} else {
						// Moving FROM trash (restore) - update the target category page
						// Use the first category from addedCategories, or uncategorized if none
						const categoryIds =
							variables.data?.addedCategories?.map((cat) => cat.id) ?? [];
						const targetCategoryId =
							categoryIds.length > 0 ? categoryIds[0] : UNCATEGORIZED_URL;
						return [BOOKMARKS_KEY, session?.user?.id, targetCategoryId, sortBy];
					}
				},
				updater: (destinationData, variables) => {
					const data = destinationData as PaginatedBookmarks | undefined;

					if (!data?.pages || data.pages.length === 0) {
						// If destination cache doesn't exist or is empty, skip optimistic update
						// Let invalidation handle the refresh
						return destinationData;
					}

					// Add bookmark to the beginning of the first page for immediate visibility
					return produce(data, (draft) => {
						if (draft.pages[0]?.data) {
							// Check if bookmark already exists (avoid duplicates)
							const exists = draft.pages[0].data.some(
								(bookmark) => bookmark.id === variables.data.id,
							);

							if (!exists) {
								draft.pages[0].data.unshift(variables.data);
							}
						}
					});
				},
			},
		],

		// Minimal invalidation - only what wasn't optimistically updated
		onSettled: (_data, error, variables) => {
			if (error) {
				return;
			}

			// Always invalidate bookmark counts (needed for sidebar)
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});

			// Invalidate trash page (destination when moving TO trash)
			// Note: Current category is NOT invalidated - we already have optimistic updates
			if (variables.isTrash) {
				void queryClient.invalidateQueries({
					queryKey: [BOOKMARKS_KEY, session?.user?.id, TRASH_URL],
				});
			}

			// If restoring FROM trash, invalidate target category (destination)
			if (!variables.isTrash) {
				const categoryIds =
					variables.data?.addedCategories?.map((cat) => cat.id) ?? [];

				// Invalidate "everything" view
				void queryClient.invalidateQueries({
					queryKey: [BOOKMARKS_KEY, session?.user?.id, null],
				});

				// Invalidate target category
				if (categoryIds.length > 0) {
					for (const catId of categoryIds) {
						void queryClient.invalidateQueries({
							queryKey: [BOOKMARKS_KEY, session?.user?.id, catId],
						});
					}
				} else {
					void queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id, UNCATEGORIZED_URL],
					});
				}
			}
		},

		showSuccessToast: false,
	});

	return { moveBookmarkToTrashOptimisticMutation };
};
