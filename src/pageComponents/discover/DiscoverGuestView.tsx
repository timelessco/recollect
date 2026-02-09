import { useMemo } from "react";
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
	const { isDesktop } = useIsMobileView();

	const { flattenedData, fetchNextPage, hasNextPage, isLoading } =
		useFetchDiscoverBookmarks({ initialData: discoverData });

	const moodboardColumns = useMemo(() => {
		if (isDesktop) {
			return [10];
		}

		return [30];
	}, [isDesktop]);

	// Hardcoded view configuration for discover guest view
	const discoverCategoryViews: BookmarkViewDataTypes = {
		bookmarksView: viewValues.moodboard as BookmarksViewTypes,
		moodboardColumns,
		cardContentViewArray: ["cover", "title", "description", "info"],
		sortBy: "date-sort-acending",
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
							loader={<div />}
							next={fetchNextPage}
							scrollableTarget="scrollableDiv"
							style={{ overflow: "unset" }}
						>
							<CardSection
								categoryViewsFromProps={discoverCategoryViews}
								isBookmarkLoading={false}
								isOgImgLoading={false}
								isPublicPage
								listData={flattenedData}
								onDeleteClick={() => {}}
								onMoveOutOfTrashClick={() => {}}
								showAvatar={false}
								userId=""
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
