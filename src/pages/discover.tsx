import { useMemo, useState } from "react";
import { type NextPage } from "next";
import InfiniteScroll from "react-infinite-scroll-component";

import useFetchBookmarksCount from "@/async/queryHooks/bookmarks/useFetchBookmarksCount";
import { useFetchDiscoverBookmarks } from "@/async/queryHooks/bookmarks/useFetchDiscoverBookmarks";
import useFetchCategories from "@/async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "@/async/queryHooks/user/useFetchUserProfile";
import { Spinner } from "@/components/spinner";
import CardSection from "@/pageComponents/dashboard/cardSection";
import DashboardLayout from "@/pageComponents/dashboard/dashboardLayout";
import { useSupabaseSession } from "@/store/componentStore";
import { type BookmarkViewDataTypes } from "@/types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "@/types/componentStoreTypes";
import { DISCOVER_URL, infoValues, viewValues } from "@/utils/constants";
import { errorToast } from "@/utils/toastMessages";

const DISCOVER_VIEWS: BookmarkViewDataTypes = {
	bookmarksView: viewValues.moodboard as unknown as BookmarksViewTypes,
	cardContentViewArray: infoValues,
	moodboardColumns: [10],
	sortBy: "date-sort-acending",
};

const Discover: NextPage = () => {
	const session = useSupabaseSession((state) => state.session);
	useFetchCategories();
	useFetchBookmarksCount();
	useFetchUserProfile();

	const [viewState, setViewState] =
		useState<BookmarkViewDataTypes>(DISCOVER_VIEWS);

	const {
		discoverData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useFetchDiscoverBookmarks();

	const flattenedDiscoverData = useMemo(
		() => discoverData?.pages?.flatMap((page) => page?.data ?? []) ?? [],
		[discoverData],
	);

	const setBookmarksView = (
		value: BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => {
		setViewState((previous) => {
			switch (type) {
				case "view":
					return { ...previous, bookmarksView: value as BookmarksViewTypes };
				case "colums":
					return { ...previous, moodboardColumns: value as number[] };
				case "info":
					return { ...previous, cardContentViewArray: value as string[] };
				case "sort":
					return { ...previous, sortBy: value as BookmarksSortByTypes };
				default:
					return previous;
			}
		});
	};

	const handleUnsupported = () => {
		errorToast("This action is not available on Discover.");
	};

	return (
		<DashboardLayout
			categoryId={DISCOVER_URL}
			onAddBookmark={handleUnsupported}
			onClearTrash={handleUnsupported}
			onDeleteCollectionClick={handleUnsupported}
			setBookmarksView={(value, type) =>
				setBookmarksView(
					value as BookmarksViewTypes | number[] | string[],
					type,
				)
			}
			uploadFileFromAddDropdown={() => handleUnsupported()}
			userId={session?.user?.id ?? ""}
			viewStateOverride={viewState}
		>
			<div
				className="pt-[60px]"
				id="discoverScrollableDiv"
				style={{
					height: "calc(100vh - 60px)",
					overflowY: "auto",
					overflowX: "hidden",
				}}
			>
				<InfiniteScroll
					dataLength={flattenedDiscoverData.length}
					hasMore={hasNextPage}
					loader={
						<div className="flex justify-center py-4">
							<Spinner className="h-4 w-4" />
						</div>
					}
					next={fetchNextPage}
					scrollableTarget="discoverScrollableDiv"
					style={{ overflow: "unset" }}
				>
					<CardSection
						categoryViewsFromProps={viewState}
						isBookmarkLoading={false}
						isLoading={isLoading && flattenedDiscoverData.length === 0}
						isOgImgLoading={isFetchingNextPage}
						isPublicPage
						listData={flattenedDiscoverData}
						onCategoryChange={() => {}}
						onCreateNewCategory={async () => {}}
						onDeleteClick={() => {}}
						onMoveOutOfTrashClick={() => {}}
						showAvatar={false}
						userId=""
					/>
				</InfiniteScroll>
			</div>
		</DashboardLayout>
	);
};

export default Discover;
