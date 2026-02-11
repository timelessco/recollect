import isNull from "lodash/isNull";
import find from "lodash/find";

import {
	type BookmarksCountTypes,
	type SingleBookmarksPaginatedDataTypes,
} from "@/types/apiTypes";

import {
	AUDIO_URL,
	DOCUMENTS_URL,
	IMAGES_URL,
	INSTAGRAM_URL,
	LINKS_URL,
	TRASH_URL,
	TWEETS_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
} from "@/utils/constants";

export type HasMoreParams = {
	isSearching: boolean;
	searchHasNextPage: boolean | undefined;
	everythingData: { pages?: unknown[] } | undefined;
	bookmarksCountData: { data?: BookmarksCountTypes | null } | undefined;
	flattendPaginationBookmarkData: unknown[] | undefined;
	CATEGORY_ID: string | number | null;
};

export function hasMoreLogic({
	isSearching,
	searchHasNextPage,
	everythingData,
	bookmarksCountData,
	flattendPaginationBookmarkData,
	CATEGORY_ID,
}: HasMoreParams): boolean {
	if (isSearching) {
		return searchHasNextPage ?? false;
	}

	const firstPage = everythingData?.pages?.[0];
	const firstPaginatedData =
		everythingData?.pages?.length !== 0 && firstPage
			? (firstPage as SingleBookmarksPaginatedDataTypes)
			: null;

	if (!isNull(firstPaginatedData)) {
		if (typeof CATEGORY_ID === "number") {
			const totalBookmarkCountInCategory = find(
				bookmarksCountData?.data?.categoryCount,
				(item) => item?.category_id === CATEGORY_ID,
			);
			return (
				totalBookmarkCountInCategory?.count !==
				flattendPaginationBookmarkData?.length
			);
		}

		if (CATEGORY_ID === null) {
			const count = bookmarksCountData?.data?.everything;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if (CATEGORY_ID === TRASH_URL) {
			const count = bookmarksCountData?.data?.trash;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if (CATEGORY_ID === UNCATEGORIZED_URL) {
			const count = bookmarksCountData?.data?.uncategorized;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if ((CATEGORY_ID as unknown) === IMAGES_URL) {
			const count = bookmarksCountData?.data?.images;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if ((CATEGORY_ID as unknown) === VIDEOS_URL) {
			const count = bookmarksCountData?.data?.videos;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if ((CATEGORY_ID as unknown) === DOCUMENTS_URL) {
			const count = bookmarksCountData?.data?.documents;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if ((CATEGORY_ID as unknown) === TWEETS_URL) {
			const count = bookmarksCountData?.data?.tweets;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if ((CATEGORY_ID as unknown) === INSTAGRAM_URL) {
			const count = bookmarksCountData?.data?.instagram;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if ((CATEGORY_ID as unknown) === AUDIO_URL) {
			const count = bookmarksCountData?.data?.audio;
			return count !== flattendPaginationBookmarkData?.length;
		}

		if ((CATEGORY_ID as unknown) === LINKS_URL) {
			const count = bookmarksCountData?.data?.links;
			return count !== flattendPaginationBookmarkData?.length;
		}

		return true;
	}

	return true;
}
