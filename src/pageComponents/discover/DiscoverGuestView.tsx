import { useEffect, useState } from "react";
import { useMediaQuery } from "@react-hookz/web";
import { isEmpty } from "lodash";
import InfiniteScroll from "react-infinite-scroll-component";

import { useIsMobileView } from "../../hooks/useIsMobileView";
import {
	type BookmarkViewDataTypes,
	type SingleListData,
} from "../../types/apiTypes";
import { type BookmarksViewTypes } from "../../types/componentStoreTypes";
import { viewValues } from "../../utils/constants";
import CardSection from "../dashboard/cardSection";

import { useFetchDiscoverBookmarks } from "@/async/queryHooks/bookmarks/use-fetch-discover-bookmarks";
import { Spinner } from "@/components/spinner";

type DiscoverGuestViewProps = {
	discoverData: SingleListData[];
};

export const DiscoverGuestView = ({ discoverData }: DiscoverGuestViewProps) => {
	const { isMobile } = useIsMobileView();
	const isDesktopMedium = useMediaQuery(
		"(min-width: 1024px) and (max-width: 1280px)",
	);
	const isDesktopLarge = useMediaQuery("(min-width: 1281px)");

	const { flattenedData, fetchNextPage, hasNextPage, isLoading } =
		useFetchDiscoverBookmarks({ initialData: discoverData });

	// Stable default for SSR + hydration, then update after mount (same breakpoints as discoverBookmarkCards)
	const [moodboardColumns, setMoodboardColumns] = useState<number[]>([30]);

	useEffect(() => {
		if (isMobile) {
			setMoodboardColumns([20]);
		} else if (isDesktopLarge) {
			setMoodboardColumns([50]);
		} else if (isDesktopMedium) {
			setMoodboardColumns([40]);
		} else {
			setMoodboardColumns([20]);
		}
	}, [isMobile, isDesktopMedium, isDesktopLarge]);

	// Hardcoded view configuration for discover guest view
	const discoverCategoryViews: BookmarkViewDataTypes = {
		bookmarksView: viewValues.moodboard as BookmarksViewTypes,
		moodboardColumns,
		cardContentViewArray: ["cover", "title", "description", "info"],
		sortBy: "date-sort-ascending",
	};

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<header className="shrink-0 border-b-[0.5px] border-b-gray-alpha-200 px-6 py-[9px]">
				<div className="flex items-center">
					<p className="text-xl leading-[23px] font-semibold text-gray-900">
						Discover
					</p>
				</div>
			</header>
			<main className="min-h-0 flex-1 overflow-hidden">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<Spinner className="h-3 w-3 animate-spin" />
					</div>
				) : !isEmpty(flattenedData) ? (
					<div
						id="scrollableDiv"
						className="h-full overflow-x-hidden overflow-y-auto"
					>
						<InfiniteScroll
							className="overflow-visible"
							dataLength={flattenedData.length}
							endMessage={
								<p className="pb-6 text-center text-plain-reverse">
									Life happens, save it.
								</p>
							}
							hasMore={hasNextPage}
							loader={null}
							next={fetchNextPage}
							scrollableTarget="scrollableDiv"
							style={{ overflow: "unset" }}
						>
							<CardSection
								categoryViewsFromProps={discoverCategoryViews}
								isDiscoverPage
								isPublicPage
								listData={flattenedData}
								onDeleteClick={() => {}}
								onMoveOutOfTrashClick={() => {}}
							/>
						</InfiniteScroll>
					</div>
				) : (
					<div className="flex h-full items-center justify-center text-2xl font-semibold">
						There is no data in this collection
					</div>
				)}
			</main>
		</div>
	);
};
