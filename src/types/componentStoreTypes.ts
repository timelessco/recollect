import { type Session, type User } from "@supabase/supabase-js";

export type ModalStoreState = {
	showClearTrashWarningModal: boolean;
	showDeleteBookmarkWarningModal: boolean;
	showSettingsModal: boolean;
	showShareCategoryModal: boolean;
	showVideoModal: boolean;
	toggleShareCategoryModal: () => void;
	toggleShowClearTrashWarningModal: () => void;
	toggleShowDeleteBookmarkWarningModal: () => void;
	toggleShowSettingsModal: () => void;
	toggleShowVideoModal: () => void;
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
	aiButtonToggle: boolean;
	currentBookmarkView: BookmarksViewTypes;
	currentSettingsPage: "change-email" | "delete" | "main";
	currentSliderDropdownSlide: string | null;
	isCardDragging: boolean;
	searchText: string;
	selectedVideoId: number | null;
	setAddScreenshotBookmarkId: (value: number | undefined) => void;
	setAiButtonToggle: (value: boolean) => void;
	setCurrentBookmarkView: (value: BookmarksViewTypes) => void;
	setCurrentSettingsPage: (
		value: MiscellaneousStoreState["currentSettingsPage"],
	) => void;
	setCurrentSliderDropdownSlide: (value: string | null) => void;
	setIsCardDragging: (value: boolean) => void;
	setSearchText: (value: string) => void;
	setSelectedVideoId: (id: number | null) => void;
	setShareCategoryId: (id: number | undefined) => void;
	setShowSidePane: (value: boolean) => void;
	shareCategoryId: number | undefined;
	showSidePane: boolean;
};

export type SupabaseSessionStore = {
	session: { user: User | null } | undefined;
	setSession: (value: SupabaseSessionStore["session"]) => void;
};

export type BookmarksViewTypes =
	| "card"
	| "headlines"
	| "list"
	| "moodboard"
	| "timeline";
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
