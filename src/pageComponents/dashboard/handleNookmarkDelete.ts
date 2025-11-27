import { find } from "lodash";

import { type ImgMetadataType, type SingleListData } from "@/types/apiTypes";

type BulkDeleteBookmarkParams = {
	bookmarkIds: number[];
	deleteForever: boolean;
	isTrash: boolean;
	isSearching: boolean;
	flattenedSearchData: SingleListData[];
	flattendPaginationBookmarkData: SingleListData[];
	deleteBookmarkId: number[] | undefined;
	setDeleteBookmarkId: (bookmarkIds: number[]) => void;
	sessionUserId: string | undefined;
	moveBookmarkToTrashOptimisticMutation: {
		mutateAsync: (data: {
			data: SingleListData;
			isTrash: boolean;
		}) => Promise<unknown>;
	};
	deleteBookmarkOptismicMutation: {
		mutateAsync: (data: {
			deleteData: Array<{
				id: number;
				title: string;
				ogImage: string;
				url: string;
				meta_data: ImgMetadataType;
			}>;
		}) => Promise<unknown>;
	};
	clearSelection: () => void;
	mutationApiCall: (apiCall: Promise<unknown>) => Promise<unknown>;
	errorToast: (message: string) => void;
};

export const handleBulkBookmarkDelete = ({
	bookmarkIds,
	deleteForever,
	isTrash,
	isSearching,
	flattenedSearchData,
	flattendPaginationBookmarkData,
	deleteBookmarkId,
	setDeleteBookmarkId,
	sessionUserId,
	moveBookmarkToTrashOptimisticMutation,
	deleteBookmarkOptismicMutation,
	clearSelection,
	mutationApiCall,
	errorToast,
}: BulkDeleteBookmarkParams) => {
	const currentBookmarksData = isSearching
		? flattenedSearchData
		: flattendPaginationBookmarkData;

	if (!deleteForever) {
		const mutations = [];
		for (const item of bookmarkIds) {
			const bookmarkId = item;
			const delBookmarksData = find(
				currentBookmarksData,
				(delItem) => delItem?.id === bookmarkId,
			) as SingleListData;

			if (delBookmarksData && delBookmarksData.user_id?.id === sessionUserId) {
				mutations.push(
					mutationApiCall(
						moveBookmarkToTrashOptimisticMutation.mutateAsync({
							data: delBookmarksData,
							isTrash,
						}),
					),
				);
			} else {
				errorToast("Cannot delete other users uploads");
			}

			void Promise.allSettled(mutations);
		}
	} else {
		const bookmarksToDelete = [...(deleteBookmarkId ?? []), ...bookmarkIds];
		if (bookmarksToDelete.length > 0) {
			setDeleteBookmarkId(bookmarksToDelete);
			const deleteData = bookmarksToDelete
				.map((delItem) => {
					const idAsNumber =
						typeof delItem === "number"
							? delItem
							: Number.parseInt(delItem as string, 10);

					const delBookmarkData = find(
						currentBookmarksData,
						(item) => item?.id === idAsNumber,
					);

					if (!delBookmarkData) {
						console.warn(`Bookmark ${idAsNumber} not found in current data`);
						return null;
					}

					const delBookmarkTitle = delBookmarkData?.title as string;
					const delBookmarkImgLink = delBookmarkData?.ogImage as string;
					const delBookmarkUrl = delBookmarkData?.url as string;

					return {
						id: idAsNumber,
						title: delBookmarkTitle,
						ogImage: delBookmarkImgLink,
						url: delBookmarkUrl,
						meta_data: delBookmarkData?.meta_data as ImgMetadataType,
					};
				})
				.filter(Boolean);

			void mutationApiCall(
				deleteBookmarkOptismicMutation.mutateAsync({
					deleteData,
				}),
			);
			setDeleteBookmarkId([]);
			// Clear selection to close the selection bar
			clearSelection();
		}
	}
};
