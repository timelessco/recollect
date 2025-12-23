import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import isEmpty from "lodash/isEmpty";
import InfiniteScroll from "react-infinite-scroll-component";

import { useFetchDiscoverBookmarks } from "../../async/queryHooks/bookmarks/useFetchDiscoverBookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import useDebounce from "../../hooks/useDebounce";
import useGetSortBy from "../../hooks/useGetSortBy";
import useGetViewValue from "../../hooks/useGetViewValue";
import {
	useLoadersStore,
	useMiscellaneousStore,
} from "../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type SingleListData,
} from "../../types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
} from "../../types/componentStoreTypes";
import { viewValues } from "../../utils/constants";

const CardSection = dynamic(async () => await import("./cardSection"), {
	ssr: false,
});

type SearchProps = {
	data: SingleListData[];
	hasNextPage: boolean;
	fetchNextPage: () => void;
	isLoading: boolean;
	dataLength: number;
};

type DiscoverProps = {
	data: SingleListData[];
	hasNextPage: boolean;
	fetchNextPage: () => void;
	isLoading: boolean;
	isFetching: boolean;
	dataLength: number;
};

export const useDiscoverDataSource = (
	isSearching: boolean,
	searchProps: SearchProps,
	discoverProps: DiscoverProps,
) =>
	isSearching
		? {
				displayData: searchProps.data,
				hasMore: searchProps.hasNextPage,
				fetchNext: searchProps.fetchNextPage,
				isLoading: searchProps.isLoading && searchProps.dataLength === 0,
				isOgImgLoading: false,
			}
		: {
				displayData: discoverProps.data,
				hasMore: discoverProps.hasNextPage,
				fetchNext: discoverProps.fetchNextPage,
				isLoading: discoverProps.isLoading && discoverProps.dataLength === 0,
				isOgImgLoading: discoverProps.isFetching,
			};

export const DiscoverBookmarkCards = () => {
	const infiniteScrollRef = useRef<HTMLDivElement>(null);

	// Search functionality
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearchText = useDebounce(searchText, 500);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

	const {
		flattenedSearchData,
		fetchNextPage: fetchNextSearchPage,
		hasNextPage: searchHasNextPage,
	} = useSearchBookmarks();

	// Discover data
	const {
		discoverData,
		fetchNextPage: fetchNextDiscoverPage,
		hasNextPage: discoverHasNextPage,
		isFetchingNextPage: isFetchingNextDiscoverPage,
		isLoading: isDiscoverLoading,
	} = useFetchDiscoverBookmarks();

	// Determine if we're currently searching (use debounced to match when query runs)
	const isSearching = !isEmpty(debouncedSearchText);

	const flattenedDiscoverData = useMemo(
		() => discoverData?.pages?.flatMap((page) => page?.data ?? []) ?? [],
		[discoverData],
	);

	// Get user's view preferences for discover page
	const discoverBookmarksView = useGetViewValue(
		"bookmarksView",
		viewValues.card,
		false,
	);
	const discoverCardContentViewArray = useGetViewValue(
		"cardContentViewArray",
		[],
		false,
	) as string[];
	const discoverMoodboardColumns = useGetViewValue(
		"moodboardColumns",
		[10],
		false,
	) as number[];
	const { sortBy: discoverSortBy } = useGetSortBy();

	// Build categoryViewsFromProps for discover page
	const discoverCategoryViews = useMemo<BookmarkViewDataTypes>(
		() => ({
			bookmarksView:
				(discoverBookmarksView as BookmarksViewTypes) ||
				(viewValues.card as BookmarksViewTypes),
			cardContentViewArray: discoverCardContentViewArray || [],
			moodboardColumns: discoverMoodboardColumns || [10],
			sortBy:
				(discoverSortBy as BookmarksSortByTypes) ||
				("date-sort-acending" as BookmarksSortByTypes),
		}),
		[
			discoverBookmarksView,
			discoverCardContentViewArray,
			discoverMoodboardColumns,
			discoverSortBy,
		],
	);

	// Use search results when searching, otherwise use discover data
	const { displayData, hasMore, fetchNext, isLoading, isOgImgLoading } =
		useDiscoverDataSource(
			isSearching,
			{
				data: flattenedSearchData,
				hasNextPage: searchHasNextPage,
				fetchNextPage: () => {
					void fetchNextSearchPage();
				},
				isLoading: isSearchLoading,
				dataLength: flattenedSearchData.length,
			},
			{
				data: flattenedDiscoverData,
				hasNextPage: discoverHasNextPage,
				fetchNextPage: () => {
					void fetchNextDiscoverPage();
				},
				isLoading: isDiscoverLoading,
				isFetching: isFetchingNextDiscoverPage,
				dataLength: flattenedDiscoverData.length,
			},
		);

	return (
		<div
			id="scrollableDiv"
			ref={infiniteScrollRef}
			className="overflow-anchor-none h-full overflow-x-hidden overflow-y-auto"
		>
			<InfiniteScroll
				dataLength={displayData.length}
				hasMore={hasMore ?? false}
				loader={<div />}
				next={fetchNext}
				scrollableTarget="scrollableDiv"
				endMessage={
					<p className="pb-6 text-center text-plain-reverse">
						{isSearchLoading ? "" : "Life happens, save it."}
					</p>
				}
				style={{ overflow: "unset", height: "100vh" }}
			>
				<CardSection
					categoryViewsFromProps={discoverCategoryViews}
					isBookmarkLoading={false}
					isLoading={isLoading}
					isOgImgLoading={isOgImgLoading}
					isPublicPage
					listData={displayData}
					onDeleteClick={() => {}}
					onMoveOutOfTrashClick={() => {}}
					showAvatar={false}
					userId=""
				/>
			</InfiniteScroll>
		</div>
	);
};
