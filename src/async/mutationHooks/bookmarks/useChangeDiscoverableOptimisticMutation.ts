import { type QueryKey } from "@tanstack/react-query";

import useDebounce from "../../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksPaginatedDataTypes,
	type SingleListData,
	type UpdateBookmarkDiscoverableApiPayload,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_KEY,
	DISCOVER_URL,
	NEXT_API_URL,
	UPDATE_BOOKMARK_DISCOVERABLE_API,
} from "../../../utils/constants";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";

const updateBookmarkPages = (
	oldData: BookmarksPaginatedDataTypes | undefined,
	bookmarkId: number,
	makeDiscoverable: boolean,
): BookmarksPaginatedDataTypes | undefined => {
	if (!oldData) {
		return oldData;
	}

	return {
		...oldData,
		pages: oldData.pages?.map((page) => ({
			...page,
			data: page.data?.map((item) =>
				item?.id === bookmarkId
					? {
							...item,
							make_discoverable: makeDiscoverable
								? new Date().toISOString()
								: null,
						}
					: item,
			),
		})),
	};
};

export const useChangeDiscoverableOptimisticMutation = () => {
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	// Primary query key for regular bookmarks
	const queryKey: QueryKey = [
		BOOKMARKS_KEY,
		session?.user?.id,
		CATEGORY_ID,
		sortBy,
	];

	// Secondary query key for search results (if searching)
	const secondaryQueryKey: QueryKey | null = debouncedSearch
		? [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, debouncedSearch]
		: null;

	const changeDiscoverableMutation = useReactQueryOptimisticMutation<
		{ data: unknown; error: unknown },
		Error,
		UpdateBookmarkDiscoverableApiPayload,
		QueryKey,
		BookmarksPaginatedDataTypes
	>({
		mutationFn: (variables) =>
			postApi<{ data: SingleListData; error: Error | null }>(
				`${NEXT_API_URL}${UPDATE_BOOKMARK_DISCOVERABLE_API}`,
				variables,
			),
		queryKey,
		secondaryQueryKey,
		updater: (currentData, variables) =>
			updateBookmarkPages(
				currentData,
				variables.bookmark_id,
				variables.make_discoverable,
			) as BookmarksPaginatedDataTypes,
		invalidates: [[BOOKMARKS_KEY, DISCOVER_URL]],
	});

	return { changeDiscoverableMutation };
};
