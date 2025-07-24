import create from "zustand";

import { type SingleListData } from "../types/apiTypes";
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
	loadingBookmarkIds: new Set<number>(),
	addLoadingBookmarkId: (id: number) =>
		set((state) => {
			const newSet = new Set(state.loadingBookmarkIds);
			newSet.add(id);
			return { loadingBookmarkIds: newSet };
		}),
	removeLoadingBookmarkId: (id: number) =>
		set((state) => {
			const newSet = new Set(state.loadingBookmarkIds);
			newSet.delete(id);
			return { loadingBookmarkIds: newSet };
		}),
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
	renderedBookmarks: {},
	setRenderedBookmarks: (categoryId: string, bookmarks: SingleListData[]) =>
		set((state) => ({
			renderedBookmarks: {
				...state.renderedBookmarks,
				[categoryId]: bookmarks,
			},
		})),
	currentSliderDropdownSlide: null,
	setCurrentSliderDropdownSlide: (value: string | null) =>
		set(() => ({ currentSliderDropdownSlide: value })),
	aiButtonToggle: false,
	setAiButtonToggle: (value: boolean) => set(() => ({ aiButtonToggle: value })),
}));

export const useSupabaseSession = create<SupabaseSessionStore>((set) => ({
	session: undefined,
	setSession: (value) => set(() => ({ session: value })),
}));
