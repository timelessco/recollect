import create from "zustand";

import {
	type BookmarksViewTypes,
	type LoadersStoreState,
	type MiscellaneousStoreState,
	type ModalStoreState,
	type SupabaseSessionStore,
} from "../types/componentStoreTypes";

export const useModalStore = create<ModalStoreState>((set) => ({
	showShareCategoryModal: false,
	toggleShareCategoryModal: () =>
		set((state) => ({
			showShareCategoryModal: !state.showShareCategoryModal,
		})),
	showDeleteBookmarkWarningModal: false,
	toggleShowDeleteBookmarkWarningModal: () =>
		set((state) => ({
			showDeleteBookmarkWarningModal: !state.showDeleteBookmarkWarningModal,
		})),
	showClearTrashWarningModal: false,
	toggleShowClearTrashWarningModal: () =>
		set((state) => ({
			showClearTrashWarningModal: !state.showClearTrashWarningModal,
		})),
	showSettingsModal: false,
	toggleShowSettingsModal: () =>
		set((state) => ({
			showSettingsModal: !state.showSettingsModal,
		})),
	showVideoModal: false,
	toggleShowVideoModal: () =>
		set((state) => ({
			showVideoModal: !state.showVideoModal,
		})),
}));

export const useLoadersStore = create<LoadersStoreState>((set) => ({
	// this is not handelled by react-query as this is a combination for 2 queries
	isSortByLoading: false,
	toggleIsSortByLoading: () =>
		set((state) => ({
			isSortByLoading: !state.isSortByLoading,
		})),
	sidePaneOptionLoading: null,
	setSidePaneOptionLoading: (value: number | string | null) =>
		set(() => ({
			sidePaneOptionLoading: value,
		})),
	isSearchLoading: false,
	toggleIsSearchLoading: (value: boolean) =>
		set(() => ({
			isSearchLoading: value,
		})),
}));

export const useMiscellaneousStore = create<MiscellaneousStoreState>((set) => ({
	shareCategoryId: undefined,
	setShareCategoryId: (id: number | undefined) =>
		set(() => ({ shareCategoryId: id })),
	searchText: "",
	setSearchText: (value: string) => set(() => ({ searchText: value })),
	addScreenshotBookmarkId: undefined,
	setAddScreenshotBookmarkId: (value: number | undefined) =>
		set(() => ({ addScreenshotBookmarkId: value })),
	isCardDragging: false,
	setIsCardDragging: (value: boolean) => set(() => ({ isCardDragging: value })),
	showSidePane: true,
	setShowSidePane: (value: boolean) => set(() => ({ showSidePane: value })),
	currentBookmarkView: "moodboard",
	setCurrentBookmarkView: (value: BookmarksViewTypes) =>
		set(() => ({ currentBookmarkView: value })),
	currentSettingsPage: "main",
	setCurrentSettingsPage: (
		value: MiscellaneousStoreState["currentSettingsPage"],
	) => set(() => ({ currentSettingsPage: value })),
	selectedVideoId: null,
	setSelectedVideoId: (value: number | null) =>
		set(() => ({ selectedVideoId: value })),

	currentSliderDropdownSlide: null,
	setCurrentSliderDropdownSlide: (value: string | null) =>
		set(() => ({ currentSliderDropdownSlide: value })),
}));

export const useSupabaseSession = create<SupabaseSessionStore>((set) => ({
	session: null,
	setSession: (value) => set(() => ({ session: value })),
}));
