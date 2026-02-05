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

			// Create a Set of bookmark IDs to remove for efficient lookup
			const bookmarkIdsToRemove = new Set(
				variables.data.map((bookmark) => bookmark.id),
			);

			// Remove the bookmarks from the current page
			return produce(currentData, (draft) => {
				for (const page of draft.pages) {
					if (!page?.data) {
						continue;
					}

					page.data = page.data.filter(
						(bookmark) => !bookmarkIdsToRemove.has(bookmark.id),
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
						// Use the first category from the first bookmark's addedCategories, or uncategorized if none
						const firstBookmark = variables.data[0];
						const categoryIds =
							firstBookmark?.addedCategories?.map((cat) => cat.id) ?? [];
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

					// Add bookmarks to the beginning of the first page for immediate visibility
					return produce(data, (draft) => {
						if (draft.pages[0]?.data) {
							// Create a Set of existing bookmark IDs for efficient lookup
							const existingIds = new Set(
								draft.pages[0].data.map((bookmark) => bookmark.id),
							);

							// Add new bookmarks that don't already exist (avoid duplicates)
							const newBookmarks = variables.data.filter(
								(bookmark) => !existingIds.has(bookmark.id),
							);

							// Add all new bookmarks to the beginning
							draft.pages[0].data.unshift(...newBookmarks);
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
		},

		showSuccessToast: false,
	});

	return { moveBookmarkToTrashOptimisticMutation };
};
