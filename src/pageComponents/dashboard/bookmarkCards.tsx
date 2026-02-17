import { useEffect, useRef } from "react";
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
import useFetchBookmarksCount from "../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import useFetchPaginatedBookmarks from "../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import { clipboardUpload } from "../../async/uploads/clipboard-upload";
import { useFileUploadDrop } from "../../hooks/useFileUploadDrop";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { mutationApiCall } from "../../utils/apiHelpers";
import { TRASH_URL } from "../../utils/constants";
import { errorToast } from "../../utils/toastMessages";

import { handleBulkBookmarkDelete } from "./handleBookmarkDelete";
import { hasMoreBookmarks } from "./hasMoreBookmarks";
import SignedOutSection from "./signedOutSection";
import { getBookmarkCountForCurrentPage } from "@/utils/helpers";

const CardSection = dynamic(async () => await import("./cardSection"), {
	ssr: false,
});

export const BookmarkCards = () => {
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { onDrop, fileUploadOptimisticMutation } = useFileUploadDrop();

	const searchText = useMiscellaneousStore((state) => state.searchText);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
	const deleteBookmarkId = useMiscellaneousStore(
		(state) => state.deleteBookmarkId,
	);
	const setDeleteBookmarkId = useMiscellaneousStore(
		(state) => state.setDeleteBookmarkId,
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
	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();
	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();

	const infiniteScrollRef = useRef<HTMLDivElement>(null);
	const isSearching = !isEmpty(searchText);

	// Global clipboard upload handler
	useEffect(() => {
		if (typeof window !== "undefined") {
			const listener = (event: ClipboardEvent) => {
				if (window.location.pathname === `/${TRASH_URL}`) {
					return;
				}

				const target = event.target as HTMLElement;
				const isEditable =
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.closest(".skip-global-paste");

				if (isEditable) {
					return;
				}

				void clipboardUpload(
					event.clipboardData?.getData("text"),
					event.clipboardData?.files,
					CATEGORY_ID,
					addBookmarkMinDataOptimisticMutation,
					fileUploadOptimisticMutation,
				);
			};

			window.addEventListener("paste", listener);
			return () => window.removeEventListener("paste", listener);
		}

		return undefined;
	}, [
		CATEGORY_ID,
		addBookmarkMinDataOptimisticMutation,
		fileUploadOptimisticMutation,
	]);

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
							ref={infiniteScrollRef}
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
								hasMore={hasMoreBookmarks({
									categoryId: CATEGORY_ID,
									countData: bookmarksCountData?.data,
									dataLength: flattendPaginationBookmarkData?.length,
									hasPaginatedData: (everythingData?.pages?.length ?? 0) > 0,
									isSearching,
									searchHasNextPage,
								})}
								loader={<div />}
								next={isSearching ? fetchNextSearchPage : fetchNextBookmarkPage}
								scrollableTarget="scrollableDiv"
								style={{ overflow: "unset" }}
							>
								<CardSection
									bookmarksCountData={getBookmarkCountForCurrentPage(
										bookmarksCountData?.data ?? undefined,
										CATEGORY_ID,
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
											? flattenedSearchData
											: flattendPaginationBookmarkData
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
};
