import { useRef } from "react";
import dynamic from "next/dynamic";
import InfiniteScroll from "react-infinite-scroll-component";

import {
	type BookmarkViewDataTypes,
	type SingleListData,
} from "../../types/apiTypes";

const CardSection = dynamic(async () => await import("./cardSection"), {
	ssr: false,
});

type DiscoverBookmarkCardsProps = {
	displayData: SingleListData[];
	hasMore: boolean;
	fetchNext: () => void;
	isLoading: boolean;
	isOgImgLoading: boolean;
	isSearchLoading: boolean;
	discoverCategoryViews: BookmarkViewDataTypes;
};

export const DiscoverBookmarkCards = ({
	displayData,
	hasMore,
	fetchNext,
	isLoading,
	isOgImgLoading,
	isSearchLoading,
	discoverCategoryViews,
}: DiscoverBookmarkCardsProps) => {
	const infiniteScrollRef = useRef<HTMLDivElement>(null);

	return (
		<div
			id="scrollableDiv"
			ref={infiniteScrollRef}
			style={{
				height: "100vh",
				overflowY: "auto",
				overflowX: "hidden",
				overflowAnchor: "none",
			}}
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
