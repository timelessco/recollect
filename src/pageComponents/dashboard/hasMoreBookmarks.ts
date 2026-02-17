import find from "lodash/find";

import { type BookmarksCountTypes } from "../../types/apiTypes";
import { type CategoryIdUrlTypes } from "../../types/componentTypes";
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
} from "../../utils/constants";

const CATEGORY_TO_COUNT_KEY: Record<string, keyof BookmarksCountTypes> = {
	[TRASH_URL]: "trash",
	[UNCATEGORIZED_URL]: "uncategorized",
	[IMAGES_URL]: "images",
	[VIDEOS_URL]: "videos",
	[DOCUMENTS_URL]: "documents",
	[TWEETS_URL]: "tweets",
	[INSTAGRAM_URL]: "instagram",
	[AUDIO_URL]: "audio",
	[LINKS_URL]: "links",
};

export type HasMoreBookmarksProps = {
	categoryId: CategoryIdUrlTypes;
	countData: BookmarksCountTypes | null | undefined;
	dataLength: number | undefined;
	hasPaginatedData: boolean;
	isSearching: boolean;
	searchHasNextPage: boolean | undefined;
};

export function hasMoreBookmarks(props: HasMoreBookmarksProps): boolean {
	const {
		categoryId,
		countData,
		dataLength,
		hasPaginatedData,
		isSearching,
		searchHasNextPage,
	} = props;

	if (isSearching) {
		return searchHasNextPage ?? false;
	}

	if (!hasPaginatedData) {
		return true;
	}

	if (typeof categoryId === "number") {
		const totalBookmarkCountInCategory = find(
			countData?.categoryCount,
			(item) => item?.category_id === categoryId,
		);

		return totalBookmarkCountInCategory?.count !== dataLength;
	}

	const countKey =
		categoryId === null ? "everything" : CATEGORY_TO_COUNT_KEY[categoryId];
	if (!countKey) {
		return true;
	}

	return countData?.[countKey] !== dataLength;
}
