import {
	type AddTagToBookmarkPayload,
	type AddTagToBookmarkResponse,
} from "@/app/api/tags/add-tag-to-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type PaginatedBookmarks, type UserTagsData } from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import {
	ADD_TAG_TO_BOOKMARK_API,
	BOOKMARKS_KEY,
	USER_TAGS_KEY,
} from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

/**
 * Mutation hook for adding an existing tag to a bookmark.
 * This is additive - it adds to existing tags without removing them.
 */
export function useAddTagToBookmarkOptimisticMutation() {
	const { queryClient, session, queryKey, searchQueryKey } =
		useBookmarkMutationContext();

	const addTagToBookmarkOptimisticMutation = useReactQueryOptimisticMutation<
		AddTagToBookmarkResponse,
		Error,
		AddTagToBookmarkPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			postApi<AddTagToBookmarkResponse>(
				`/api${ADD_TAG_TO_BOOKMARK_API}`,
				payload,
			),
		queryKey,
		secondaryQueryKey: searchQueryKey,

		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
			}

			// Resolve tag from cache - skip optimistic update if not found
			const userTagsData = queryClient.getQueryData([
				USER_TAGS_KEY,
				session?.user?.id,
			]) as { data: UserTagsData[] } | undefined;

			const tagInfo = userTagsData?.data?.find(
				(tag) => tag.id === variables.tagId,
			);

			if (!tagInfo) {
				logCacheMiss("Optimistic Update", "Tag not found in cache", {
					bookmarkId: variables.bookmarkId,
					tagId: variables.tagId,
				});
				return currentData;
			}

			return (
				updateBookmarkInPaginatedData(
					currentData,
					variables.bookmarkId,
					(bookmark) => {
						// Check for duplicates
						const alreadyHasTag = bookmark.addedTags?.some(
							(tag) => tag.id === variables.tagId,
						);
						if (alreadyHasTag) {
							return;
						}

						bookmark.addedTags = [
							...(bookmark.addedTags ?? []),
							{ id: variables.tagId, name: tagInfo.name } as UserTagsData,
						];
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
	});

	return { addTagToBookmarkOptimisticMutation };
}
