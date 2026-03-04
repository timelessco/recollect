import { create } from "zustand";

import { type SingleListData } from "../types/apiTypes";
import {
	type BookmarksViewTypes,
	type LoadersStoreState,
	type MiscellaneousStoreState,
	type ModalStoreState,
	type SupabaseSessionStore,
} from "../types/componentStoreTypes";

export const useModalStore = create<ModalStoreState>((set) => ({
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
	isBookmarkAdding: false,
	setIsBookmarkAdding: (value: boolean) =>
		set(() => ({
			isBookmarkAdding: value,
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
	isCollectionChanged: false,
	setIsCollectionChanged: (value: boolean) =>
		set((state) => ({ ...state, isCollectionChanged: value })),
	lightboxId: null,
	setLightboxId: (id: string | null) =>
		set((state) => ({ ...state, lightboxId: id })),
	lightboxOpen: false,
	setLightboxOpen: (open: boolean) =>
		set((state) => ({ ...state, lightboxOpen: open })),
	shareCategoryId: undefined,
	setShareCategoryId: (id: number | undefined) =>
		set(() => ({ shareCategoryId: id })),
	lightboxShowSidepane: false,
	setLightboxShowSidepane: (value: boolean) =>
		set(() => ({ lightboxShowSidepane: value })),
	searchText: "",
	setSearchText: (value: string) => set(() => ({ searchText: value })),
	triggerHeadingEdit: false,
	setTriggerHeadingEdit: (value: boolean) =>
		set(() => ({ triggerHeadingEdit: value })),
	addScreenshotBookmarkId: undefined,
	setAddScreenshotBookmarkId: (value: number | undefined) =>
		set(() => ({ addScreenshotBookmarkId: value })),
	isCardDragging: false,
	setIsCardDragging: (value: boolean) => set(() => ({ isCardDragging: value })),
	currentBookmarkView: "moodboard",
	setCurrentBookmarkView: (value: BookmarksViewTypes) =>
		set(() => ({ currentBookmarkView: value })),
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
	deleteBookmarkId: undefined,
	setDeleteBookmarkId: (bookmarkIds: number[]) =>
		set(() => ({ deleteBookmarkId: bookmarkIds })),
}));

export const useSupabaseSession = create<SupabaseSessionStore>((set) => ({
	session: undefined,
	setSession: (value) => set(() => ({ session: value })),
}));
