import { type RefObject } from "react";
import dynamic from "next/dynamic";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import omit from "lodash/omit";
import Dropzone from "react-dropzone";
import InfiniteScroll from "react-infinite-scroll-component";

import { useMoveBookmarkToTrashOptimisticMutation } from "../../async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation";
import useAddBookmarkMinDataOptimisticMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useAddBookmarkScreenshotMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkScreenshotMutation";
import useDeleteBookmarksOptimisticMutation from "../../async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation";
import useFileUploadOptimisticMutation from "../../async/mutationHooks/files/useFileUploadOptimisticMutation";
import useFetchBookmarksCount from "../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import useFetchPaginatedBookmarks from "../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import useDebounce from "../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type FileType } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import { TRASH_URL } from "../../utils/constants";
import { getBookmarkCountForCurrentPage } from "../../utils/helpers";
import { errorToast } from "../../utils/toastMessages";

import { handleBulkBookmarkDelete } from "./handleBookmarkDelete";
import SignedOutSection from "./signedOutSection";
import { hasMoreLogic } from "./utils/hasMoreLogic";

const CardSection = dynamic(async () => await import("./cardSection"), {
	ssr: false,
});

type DashboardBookmarksPaneProps = {
	scrollContainerRef: RefObject<HTMLDivElement | null>;
};

export function DashboardBookmarksPane({
	scrollContainerRef,
}: DashboardBookmarksPaneProps) {
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearchText = useDebounce(searchText, 500);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
	const setDeleteBookmarkId = useMiscellaneousStore(
		(state) => state.setDeleteBookmarkId,
	);
	const deleteBookmarkId = useMiscellaneousStore(
		(state) => state.deleteBookmarkId,
	);

	const { allCategories } = useFetchCategories();
	const { bookmarksCountData } = useFetchBookmarksCount();
	const {
		everythingData,
		flattendPaginationBookmarkData,
		fetchNextPage: fetchNextBookmarkPage,
		isEverythingDataLoading,
	} = useFetchPaginatedBookmarks();
	const {
		flattenedSearchData,
		fetchNextPage: fetchNextSearchPage,
		hasNextPage: searchHasNextPage,
	} = useSearchBookmarks();
	const { isLoading: isUserProfileLoading } = useFetchUserProfile();

	const { moveBookmarkToTrashOptimisticMutation } =
		useMoveBookmarkToTrashOptimisticMutation();
	const { deleteBookmarkOptismicMutation } =
		useDeleteBookmarksOptimisticMutation();
	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();
	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();
	const { fileUploadOptimisticMutation } = useFileUploadOptimisticMutation();

	const isSearching = !isEmpty(debouncedSearchText);

	const hasMore = hasMoreLogic({
		isSearching,
		searchHasNextPage,
		everythingData,
		bookmarksCountData,
		flattendPaginationBookmarkData,
		CATEGORY_ID,
	});

	const onDrop = async (acceptedFiles: FileType[]) => {
		const { fileUpload } = await import("../../async/uploads/file-upload");
		await fileUpload(
			acceptedFiles as unknown as FileList,
			fileUploadOptimisticMutation,
			CATEGORY_ID,
		);
	};

	if (!session) {
		return <SignedOutSection />;
	}

	return (
		<>
			<div className="mx-auto w-full max-xl:w-1/2" />
			<Dropzone disabled={CATEGORY_ID === TRASH_URL} noClick onDrop={onDrop}>
				{({ getRootProps, getInputProps, isDragActive }) => (
					<div
						{...omit(getRootProps(), ["onBlur", "onFocus"])}
						className={
							isDragActive
								? "absolute z-10 h-full w-full bg-gray-800 opacity-50"
								: "outline-hidden"
						}
					>
						<input {...getInputProps()} />
						<div
							id="scrollableDiv"
							ref={scrollContainerRef}
							style={{
								height: "100vh",
								overflowY: "auto",
								overflowX: "hidden",
								overflowAnchor: "none",
							}}
						>
							<InfiniteScroll
								dataLength={
									isSearching
										? (flattenedSearchData?.length ?? 0)
										: (flattendPaginationBookmarkData?.length ?? 0)
								}
								endMessage={
									<p className="pb-6 text-center text-plain-reverse">
										{isSearchLoading ? "" : "Life happens, save it."}
									</p>
								}
								hasMore={isSearching ? searchHasNextPage : hasMore}
								loader={<div />}
								next={isSearching ? fetchNextSearchPage : fetchNextBookmarkPage}
								scrollableTarget="scrollableDiv"
								style={{ overflow: "unset" }}
							>
								<CardSection
									bookmarksCountData={getBookmarkCountForCurrentPage(
										bookmarksCountData?.data ?? undefined,
										CATEGORY_ID as unknown as string | number | null,
									)}
									flattendPaginationBookmarkData={
										flattendPaginationBookmarkData
									}
									isBookmarkLoading={
										addBookmarkMinDataOptimisticMutation?.isPending
									}
									isLoading={
										isEverythingDataLoading ||
										(isSearchLoading &&
											(flattenedSearchData?.length ?? 0) === 0)
									}
									isLoadingProfile={isUserProfileLoading}
									isOgImgLoading={addBookmarkScreenshotMutation?.isPending}
									listData={
										isSearching
											? (flattenedSearchData ?? [])
											: (flattendPaginationBookmarkData ?? [])
									}
									onDeleteClick={(item) => {
										if (CATEGORY_ID === TRASH_URL) {
											handleBulkBookmarkDelete({
												bookmarkIds: item?.map((delItem) => delItem?.id),
												deleteForever: true,
												isTrash: true,
												isSearching,
												flattenedSearchData: flattenedSearchData ?? [],
												flattendPaginationBookmarkData:
													flattendPaginationBookmarkData ?? [],
												deleteBookmarkId,
												setDeleteBookmarkId,
												sessionUserId: session?.user?.id,
												moveBookmarkToTrashOptimisticMutation,
												deleteBookmarkOptismicMutation,
												clearSelection: () => {},
												mutationApiCall,
												errorToast,
											});
										} else if (!isEmpty(item) && item?.length > 0) {
											const firstItem = item.at(0);
											if (firstItem) {
												void mutationApiCall(
													moveBookmarkToTrashOptimisticMutation.mutateAsync({
														data: [firstItem],
														isTrash: true,
													}),
													// eslint-disable-next-line promise/prefer-await-to-then
												).catch(() => {});
											}
										}
									}}
									onMoveOutOfTrashClick={(data) => {
										void mutationApiCall(
											moveBookmarkToTrashOptimisticMutation.mutateAsync({
												data: [data],
												isTrash: false,
											}),
										);
									}}
									showAvatar={Boolean(
										CATEGORY_ID &&
										!isNull(CATEGORY_ID) &&
										(allCategories?.data?.find(
											(item) => item?.id === CATEGORY_ID,
										)?.collabData?.length ?? 0) > 1,
									)}
									userId={session?.user?.id ?? ""}
								/>
							</InfiniteScroll>
						</div>
					</div>
				)}
			</Dropzone>
		</>
	);
}
