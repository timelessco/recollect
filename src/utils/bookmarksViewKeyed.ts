import {
	type BookmarkViewDataTypes,
	type ProfilesBookmarksViewOrLegacy,
} from "../types/apiTypes";

import { EVERYTHING_URL, PAGE_VIEW_SLUGS } from "./constants";

/**
 * Page key for keyed bookmarks_view: slug if in PAGE_VIEW_SLUGS, else "everything".
 */
export function getPageViewKey(slug: string | null): string {
	if (!slug) {
		return EVERYTHING_URL;
	}

	return PAGE_VIEW_SLUGS.includes(slug as (typeof PAGE_VIEW_SLUGS)[number])
		? slug
		: EVERYTHING_URL;
}

/**
 * True if bookmarks_view is legacy flat shape (top-level bookmarksView key).
 */
export function isLegacyBookmarksView(
	view: ProfilesBookmarksViewOrLegacy | null | undefined,
): view is BookmarkViewDataTypes {
	return (
		view !== null &&
		view !== undefined &&
		typeof view === "object" &&
		!("everything" in view) &&
		"bookmarksView" in view
	);
}

/**
 * Resolve view data for a page from keyed (or legacy) bookmarks_view.
 */
export function getPageViewData(
	bookmarksView: ProfilesBookmarksViewOrLegacy | null | undefined,
	pageKey: string,
): BookmarkViewDataTypes | undefined {
	if (!bookmarksView || typeof bookmarksView !== "object") {
		return undefined;
	}

	const keyed = isLegacyBookmarksView(bookmarksView)
		? { [EVERYTHING_URL]: bookmarksView }
		: bookmarksView;
	return keyed[pageKey] ?? keyed[EVERYTHING_URL];
}
