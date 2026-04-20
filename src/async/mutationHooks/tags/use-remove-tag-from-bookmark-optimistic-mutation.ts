import type {
  RemoveTagFromBookmarkInput,
  RemoveTagFromBookmarkOutput,
} from "@/app/api/v2/tags/remove-tag-from-bookmark/schema";
import type { PaginatedBookmarks } from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { BOOKMARKS_KEY, V2_REMOVE_TAG_FROM_BOOKMARK_API } from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

/**
 * Mutation hook for removing a tag from a bookmark.
 */
export function useRemoveTagFromBookmarkOptimisticMutation() {
  const { queryClient, queryKey, searchQueryKey, session } = useBookmarkMutationContext();

  const removeTagFromBookmarkOptimisticMutation = useReactQueryOptimisticMutation<
    RemoveTagFromBookmarkOutput,
    Error,
    RemoveTagFromBookmarkInput,
    typeof queryKey,
    PaginatedBookmarks
  >({
    mutationFn: (payload) =>
      api
        .post(V2_REMOVE_TAG_FROM_BOOKMARK_API, { json: payload })
        .json<RemoveTagFromBookmarkOutput>(),
    onSettled: (_data, error) => {
      if (error) {
        return;
      }

      // Invalidate ALL bookmark queries for user (covers all collections)
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });
    },
    queryKey,

    secondaryQueryKey: searchQueryKey,

    updater: (currentData, variables) => {
      if (!currentData?.pages) {
        return currentData!;
      }

      return (
        updateBookmarkInPaginatedData(currentData, variables.bookmarkId, (bookmark) => {
          bookmark.addedTags = bookmark.addedTags?.filter((tag) => tag.id !== variables.tagId);
        }) ?? currentData
      );
    },
  });

  return { removeTagFromBookmarkOptimisticMutation };
}
