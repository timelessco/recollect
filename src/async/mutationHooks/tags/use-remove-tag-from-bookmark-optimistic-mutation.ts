import {
	type RemoveTagFromBookmarkPayload,
	type RemoveTagFromBookmarkResponse,
} from "@/app/api/tags/remove-tag-from-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type PaginatedBookmarks } from "@/types/apiTypes";
import { BOOKMARKS_KEY, REMOVE_TAG_FROM_BOOKMARK_API } from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

/**
 * Mutation hook for removing a tag from a bookmark.
 */
export function useRemoveTagFromBookmarkMutation() {
	const { queryClient, session, queryKey, searchQueryKey } =
		useBookmarkMutationContext();

	const removeTagFromBookmarkMutation = useReactQueryOptimisticMutation<
		RemoveTagFromBookmarkResponse,
		Error,
		RemoveTagFromBookmarkPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			postApi<RemoveTagFromBookmarkResponse>(
				`/api${REMOVE_TAG_FROM_BOOKMARK_API}`,
				payload,
			),
		queryKey,
		secondaryQueryKey: searchQueryKey,

		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
			}

			return (
				updateBookmarkInPaginatedData(
					currentData,
					variables.bookmarkId,
					(bookmark) => {
						bookmark.addedTags = bookmark.addedTags?.filter(
							(tag) => tag.id !== variables.tagId,
						);
					},
				) ?? currentData
			);
		},

		onSettled: (_data, error) => {
			if (error) {
				return;
			}

			// Invalidate ALL bookmark queries for user (covers all collections)
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id],
			});
		},

		showSuccessToast: true,
		successMessage: "Tag removed",
	});

	return { removeTagFromBookmarkMutation };
}
