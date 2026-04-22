import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import { useMediaQuery } from "@react-hookz/web";
import isEmpty from "lodash/isEmpty";

import type { BookmarkViewDataTypes, SingleListData } from "../../types/apiTypes";
import type { BookmarksViewTypes } from "../../types/componentStoreTypes";

import { useFetchDiscoverBookmarks } from "@/async/queryHooks/bookmarks/use-fetch-discover-bookmarks";

import useSearchBookmarks from "../../async/queryHooks/bookmarks/use-search-bookmarks";
import { useIsMobileView } from "../../hooks/useIsMobileView";
import { useLoadersStore, useMiscellaneousStore } from "../../store/componentStore";
import { viewValues } from "../../utils/constants";
import { BookmarksSkeletonLoader } from "./cardSection/bookmarksSkeleton";

const CardSection = dynamic(() => import("./cardSection"), { ssr: false });

interface SearchProps {
  data: SingleListData[];
  dataLength: number;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
}

interface DiscoverProps {
  data: SingleListData[];
  dataLength: number;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
}

export const getDiscoverDataSource = (
  isSearching: boolean,
  searchProps: SearchProps,
  discoverProps: DiscoverProps,
) =>
  isSearching
    ? {
        displayData: searchProps.data,
        fetchNext: searchProps.fetchNextPage,
        hasMore: searchProps.hasNextPage,
        isLoading: searchProps.isLoading && searchProps.dataLength === 0,
      }
    : {
        displayData: discoverProps.data,
        fetchNext: discoverProps.fetchNextPage,
        hasMore: discoverProps.hasNextPage,
        isLoading: discoverProps.isLoading && discoverProps.dataLength === 0,
      };

interface DiscoverBookmarkCardsProps {
  isDiscoverPage: boolean;
}

export const DiscoverBookmarkCards = ({ isDiscoverPage }: DiscoverBookmarkCardsProps) => {
  const infiniteScrollRef = useRef<HTMLDivElement>(null);

  // Search functionality
  const searchText = useMiscellaneousStore((state) => state.searchText);
  const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

  const {
    fetchNextPage: fetchNextSearchPage,
    flattenedSearchData,
    hasNextPage: searchHasNextPage,
  } = useSearchBookmarks();
  const { isMobile } = useIsMobileView();
  const isDesktopMedium = useMediaQuery("(min-width: 1024px) and (max-width: 1280px)");
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

  const flattenedDiscoverData = useMemo(() => discoverData?.pages?.flat() ?? [], [discoverData]);

  // Hardcoded view configuration for discover (same as DiscoverGuestView)
  const discoverCategoryViews = useMemo<BookmarkViewDataTypes>(
    () => ({
      bookmarksView: viewValues.moodboard as BookmarksViewTypes,
      cardContentViewArray: ["cover", "title"],
      moodboardColumns: discoverMoodboardColumnsResponsive,
      sortBy: "date-sort-ascending",
    }),
    [discoverMoodboardColumnsResponsive],
  );

  // Use search results when searching, otherwise use discover data
  const { displayData, fetchNext, hasMore, isLoading } = getDiscoverDataSource(
    isSearching,
    {
      data: flattenedSearchData,
      dataLength: flattenedSearchData.length,
      fetchNextPage: () => {
        void fetchNextSearchPage();
      },
      hasNextPage: searchHasNextPage,
      isLoading: isSearchLoading,
    },
    {
      data: flattenedDiscoverData,
      dataLength: flattenedDiscoverData.length,
      fetchNextPage: () => {
        void fetchNextDiscoverPage();
      },
      hasNextPage: discoverHasNextPage,
      isLoading: isDiscoverLoading,
    },
  );

  if (isDiscoverLoading) {
    const [cols] = discoverMoodboardColumnsResponsive;
    const skeletonCount = cols * 2;
    return (
      <BookmarksSkeletonLoader colCount={cols} count={skeletonCount} type={viewValues.moodboard} />
    );
  }

  return (
    <div
      className="h-screen overflow-x-hidden overflow-y-auto"
      id="scrollableDiv"
      ref={infiniteScrollRef}
    >
      <InfiniteScroll
        className="h-screen overflow-visible"
        dataLength={displayData.length}
        endMessage={
          <p className="pb-6 text-center text-plain-reverse">
            {isSearchLoading ? "" : "Life happens, save it."}
          </p>
        }
        hasMore={hasMore ?? false}
        loader={<div />}
        next={fetchNext}
        scrollableTarget="scrollableDiv"
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
