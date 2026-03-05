import {
	type PaginatedBookmarks,
	type SingleListData,
	type UserTagsData,
} from "@/types/apiTypes";
import { logCacheMiss } from "@/utils/cache-debug-helpers";

/**
 * Update a specific bookmark within paginated infinite query data.
 * Returns new data with the bookmark updated, or unchanged if not found.
 * @param data - The paginated bookmarks data
 * @param bookmarkId - The ID of the bookmark to update
 * @param updater - Function that returns a new bookmark object
 */
export function updateBookmarkInPaginatedData(
	data: PaginatedBookmarks | undefined,
	bookmarkId: number,
	updater: (bookmark: SingleListData) => SingleListData,
): PaginatedBookmarks | undefined {
	if (!data?.pages) {
		return data;
	}

	let bookmarkFound = false;

	const pages = data.pages.map((page) => {
		if (bookmarkFound || !page?.data) {
			return page;
		}

		const bookmarkIndex = page.data.findIndex((bm) => bm.id === bookmarkId);
		if (bookmarkIndex === -1) {
			return page;
		}

		bookmarkFound = true;
		return {
			...page,
			data: page.data.map((bm, index) =>
				index === bookmarkIndex ? updater(bm) : bm,
			),
		};
	});

	if (!bookmarkFound) {
		logCacheMiss("Cache Update", "Bookmark not found in paginated cache", {
			bookmarkId,
			pageCount: data.pages.length,
		});
	}

	return bookmarkFound ? { ...data, pages } : data;
}

/**
 * Swap a temp tag ID with the real tag from server response.
 * Returns a new bookmark with the temp tag replaced by the real tag.
 * @param bookmark - The bookmark containing the temp tag
 * @param tempId - The temporary ID used for optimistic update
 * @param realTag - The real tag data from server response
 * @param realTag.id - The real tag ID
 * @param realTag.name - The real tag name
 */
export function swapTempTagId(
	bookmark: SingleListData,
	tempId: number,
	realTag: { id: number; name: string | null },
): SingleListData {
	const tagIndex = bookmark.addedTags?.findIndex(
		(existing) => existing.id === tempId,
	);

	if (tagIndex === undefined || tagIndex === -1) {
		logCacheMiss("Cache Update", "Temp tag not found in bookmark", {
			bookmarkId: bookmark.id,
			tempId,
			realTagId: realTag.id,
			existingTagIds: bookmark.addedTags?.map((tag) => tag.id) ?? [],
		});
		return bookmark;
	}

	return {
		...bookmark,
		addedTags: bookmark.addedTags?.map((tag) =>
			tag.id === tempId
				? { ...tag, id: realTag.id, name: realTag.name ?? tag.name }
				: tag,
		),
	};
}

/**
 * Update user tags cache.
 * Replaces a temp tag with real tag data from server.
 * @param data - The user tags cache data
 * @param tempId - The temporary ID to replace
 * @param realTag - The real tag data from server
 * @param realTag.id - The real tag ID
 * @param realTag.name - The real tag name
 * @param [realTag.user_id] - The user ID (optional)
 * @param [realTag.created_at] - The creation timestamp (optional)
 */
export function swapTempTagInUserTagsCache(
	data: { data: UserTagsData[] } | undefined,
	tempId: number,
	realTag: {
		id: number;
		name: string | null;
		user_id?: string;
		created_at?: string;
	},
): { data: UserTagsData[] } | undefined {
	if (!data?.data) {
		return data;
	}

	const tagExists = data.data.some((existing) => existing.id === tempId);
	if (!tagExists) {
		logCacheMiss("Cache Update", "Temp tag not found in user tags cache", {
			tempId,
			tagCount: data.data.length,
		});
		return data;
	}

	return {
		...data,
		data: data.data.map((tag) => {
			if (tag.id !== tempId) {
				return tag;
			}

			return {
				...tag,
				id: realTag.id,
				name: realTag.name ?? tag.name,
				...(realTag.user_id && { user_id: realTag.user_id }),
				...(realTag.created_at && { created_at: realTag.created_at }),
			};
		}),
	};
}
