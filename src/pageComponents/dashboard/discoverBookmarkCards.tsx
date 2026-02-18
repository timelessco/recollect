import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useMediaQuery } from "@react-hookz/web";
import isEmpty from "lodash/isEmpty";
import InfiniteScroll from "react-infinite-scroll-component";

import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import { useIsMobileView } from "../../hooks/useIsMobileView";
import {
	useLoadersStore,
	useMiscellaneousStore,
} from "../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type SingleListData,
} from "../../types/apiTypes";
import { type BookmarksViewTypes } from "../../types/componentStoreTypes";
import { viewValues } from "../../utils/constants";

import { BookmarksSkeletonLoader } from "./cardSection/bookmarksSkeleton";
import { useFetchDiscoverBookmarks } from "@/async/queryHooks/bookmarks/use-fetch-discover-bookmarks";

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
			}
		: {
				displayData: discoverProps.data,
				hasMore: discoverProps.hasNextPage,
				fetchNext: discoverProps.fetchNextPage,
				isLoading: discoverProps.isLoading && discoverProps.dataLength === 0,
			};

type DiscoverBookmarkCardsProps = {
	isDiscoverPage: boolean;
};

export const DiscoverBookmarkCards = ({
	isDiscoverPage,
}: DiscoverBookmarkCardsProps) => {
	const infiniteScrollRef = useRef<HTMLDivElement>(null);

	// Search functionality
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

	const {
		flattenedSearchData,
		fetchNextPage: fetchNextSearchPage,
		hasNextPage: searchHasNextPage,
	} = useSearchBookmarks();
	const { isMobile } = useIsMobileView();
	const isDesktopMedium = useMediaQuery(
		"(min-width: 1024px) and (max-width: 1280px)",
	);
	const isDesktopLarge = useMediaQuery("(min-width: 1281px)");

	// Responsive moodboard columns for discover: mobile/tablet 20, 1024–1280 40, above 1280 50
	const discoverMoodboardColumnsResponsive = useMemo(() => {
		if (isMobile) {
			return [20];
		}

		if (isDesktopLarge) {
			return [50];
		}

		if (isDesktopMedium) {
			return [40];
		}

		return [20];
	}, [isMobile, isDesktopMedium, isDesktopLarge]);

	// Discover data
	const {
		discoverData,
		fetchNextPage: fetchNextDiscoverPage,
		hasNextPage: discoverHasNextPage,
		isLoading: isDiscoverLoading,
	} = useFetchDiscoverBookmarks({ enabled: isDiscoverPage });

	// Determine if we're currently searching (searchText is debounced at source)
	const isSearching = !isEmpty(searchText);

	const flattenedDiscoverData = useMemo(
		() => discoverData?.pages?.flatMap((page) => page?.data ?? []) ?? [],
		[discoverData],
	);

	// Hardcoded view configuration for discover (same as DiscoverGuestView)
	const discoverCategoryViews = useMemo<BookmarkViewDataTypes>(
		() => ({
			bookmarksView: viewValues.moodboard as BookmarksViewTypes,
			cardContentViewArray: ["cover", "title", "description", "info"],
			moodboardColumns: discoverMoodboardColumnsResponsive,
			sortBy: "date-sort-ascending",
		}),
		[discoverMoodboardColumnsResponsive],
	);

	// Use search results when searching, otherwise use discover data
	const { displayData, hasMore, fetchNext, isLoading } = useDiscoverDataSource(
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
			dataLength: flattenedDiscoverData.length,
		},
	);

	if (isDiscoverLoading) {
		const cols = discoverMoodboardColumnsResponsive[0];
		const skeletonCount = cols * 2;
		return (
			<BookmarksSkeletonLoader
				count={skeletonCount}
				type={viewValues.moodboard}
				colCount={cols}
			/>
		);
	}

	return (
		<div
			id="scrollableDiv"
			ref={infiniteScrollRef}
			className="h-screen overflow-x-hidden overflow-y-auto"
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
				className="h-screen overflow-visible"
			>
				<CardSection
					categoryViewsFromProps={discoverCategoryViews}
					isDiscoverPage
					isLoading={isLoading}
					isPublicPage
					listData={displayData}
				/>
			</InfiniteScroll>
		</div>
	);
};
