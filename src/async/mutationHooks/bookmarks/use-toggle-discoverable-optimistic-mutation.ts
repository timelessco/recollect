import {
	type ToggleBookmarkDiscoverablePayload,
	type ToggleBookmarkDiscoverableResponse,
} from "@/app/api/bookmark/toggle-discoverable-on-bookmark/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type BookmarksPaginatedDataTypes } from "@/types/apiTypes";
import {
	BOOKMARKS_KEY,
	NEXT_API_URL,
	TOGGLE_BOOKMARK_DISCOVERABLE_API,
} from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

export function useToggleDiscoverableOptimisticMutation() {
	const { queryKey, searchQueryKey } = useBookmarkMutationContext();

	const toggleDiscoverableMutation = useReactQueryOptimisticMutation<
		ToggleBookmarkDiscoverableResponse,
		Error,
		ToggleBookmarkDiscoverablePayload,
		typeof queryKey,
		BookmarksPaginatedDataTypes
	>({
		mutationFn: (variables) =>
			postApi<ToggleBookmarkDiscoverableResponse>(
				`${NEXT_API_URL}${TOGGLE_BOOKMARK_DISCOVERABLE_API}`,
				variables,
			),
		queryKey,
		secondaryQueryKey: searchQueryKey,
		updater: (currentData, variables) =>
			updateBookmarkInPaginatedData(
				currentData,
				variables.bookmark_id,
				(bookmark) => {
					bookmark.make_discoverable = variables.make_discoverable
						? "pending"
						: null;
				},
			) as BookmarksPaginatedDataTypes,
		invalidates: [[BOOKMARKS_KEY]],
	});

	return { toggleDiscoverableMutation };
}
