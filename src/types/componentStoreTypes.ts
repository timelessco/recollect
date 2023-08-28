export type ModalStoreState = {
	showAddBookmarkShortcutModal: boolean;
	showClearTrashWarningModal: boolean;
	showDeleteBookmarkWarningModal: boolean;
	showSettingsModal: boolean;
	showShareCategoryModal: boolean;
	toggleShareCategoryModal: () => void;
	toggleShowAddBookmarkShortcutModal: () => void;
	toggleShowClearTrashWarningModal: () => void;
	toggleShowDeleteBookmarkWarningModal: () => void;
	toggleShowSettingsModal: () => void;
};

export type LoadersStoreState = {
	isSearchLoading: boolean;
	isSortByLoading: boolean;
	setSidePaneOptionLoading: (value: number | string | null) => void;
	sidePaneOptionLoading: number | string | null;
	toggleIsSearchLoading: (value: boolean) => void;
	toggleIsSortByLoading: () => void;
};

export type MiscellaneousStoreState = {
	addScreenshotBookmarkId: number | undefined;
	currentBookmarkView: BookmarksViewTypes;
	isCardDragging: boolean;
	searchText: string;
	setAddScreenshotBookmarkId: (value: number | undefined) => void;
	setCurrentBookmarkView: (value: BookmarksViewTypes) => void;
	setIsCardDragging: (value: boolean) => void;
	setSearchText: (value: string) => void;
	setShareCategoryId: (id: number | undefined) => void;
	setShowSidePane: (value: boolean) => void;
	shareCategoryId: number | undefined;
	showSidePane: boolean;
};

export type BookmarksViewTypes = "card" | "headlines" | "list" | "moodboard";
export type BookmarkViewCategories = "colums" | "info" | "sort" | "view";
export type BookmarksSortByTypes =
	| "alphabetical-sort-acending"
	| "alphabetical-sort-decending"
	| "date-sort-acending"
	| "date-sort-decending"
	| "url-sort-acending"
	| "url-sort-decending";

// export interface BookmarkCardViewState {
//   moodboardColumns: number[] | number;
//   setMoodboardColumns: (value: number[] | number) => void;
//   cardContentViewArray: string[];
//   setCardContentViewArray: (arr: string[]) => void;
//   bookmarksView: BookmarksViewTypes;
//   setBookmarksView: (value: BookmarksViewTypes) => void;
//   sortBy: BookmarksSortByTypes;
//   setSortBy: (value: BookmarksSortByTypes) => void;
// }
