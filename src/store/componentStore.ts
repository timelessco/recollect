import { create } from "zustand";

import type { SingleListData } from "../types/apiTypes";
import type {
  BookmarksViewTypes,
  LoadersStoreState,
  MiscellaneousStoreState,
  ModalStoreState,
  SupabaseSessionStore,
} from "../types/componentStoreTypes";

export const useModalStore = create<ModalStoreState>((set) => ({
  showVideoModal: false,
  toggleShowVideoModal: () => {
    set((state) => ({
      showVideoModal: !state.showVideoModal,
    }));
  },
}));

export const useLoadersStore = create<LoadersStoreState>((set) => ({
  addLoadingBookmarkId: (id: number) => {
    set((state) => {
      const newSet = new Set([...state.loadingBookmarkIds, id]);
      return { loadingBookmarkIds: newSet };
    });
  },
  isBookmarkAdding: false,
  isSearchLoading: false,
  // this is not handelled by react-query as this is a combination for 2 queries
  isSortByLoading: false,
  loadingBookmarkIds: new Set<number>(),
  removeLoadingBookmarkId: (id: number) => {
    set((state) => {
      const newSet = new Set(state.loadingBookmarkIds);
      newSet.delete(id);
      return { loadingBookmarkIds: newSet };
    });
  },
  setIsBookmarkAdding: (value: boolean) => {
    set(() => ({
      isBookmarkAdding: value,
    }));
  },
  toggleIsSearchLoading: (value: boolean) => {
    set(() => ({
      isSearchLoading: value,
    }));
  },
  toggleIsSortByLoading: () => {
    set((state) => ({
      isSortByLoading: !state.isSortByLoading,
    }));
  },
}));

export const useMiscellaneousStore = create<MiscellaneousStoreState>((set) => ({
  addScreenshotBookmarkId: undefined,
  currentBookmarkView: "moodboard",
  deleteBookmarkId: undefined,
  isCardDragging: false,
  isCollectionChanged: false,
  lightboxId: null,
  lightboxOpen: false,
  lightboxShowSidepane: false,
  renderedBookmarks: {},
  searchText: "",
  selectedVideoId: null,
  setAddScreenshotBookmarkId: (value: number | undefined) => {
    set(() => ({ addScreenshotBookmarkId: value }));
  },
  setCurrentBookmarkView: (value: BookmarksViewTypes) => {
    set(() => ({ currentBookmarkView: value }));
  },
  setDeleteBookmarkId: (bookmarkIds: number[]) => {
    set(() => ({ deleteBookmarkId: bookmarkIds }));
  },
  setIsCardDragging: (value: boolean) => {
    set(() => ({ isCardDragging: value }));
  },
  setIsCollectionChanged: (value: boolean) => {
    set((state) => ({ ...state, isCollectionChanged: value }));
  },
  setLightboxId: (id: null | string) => {
    set((state) => ({ ...state, lightboxId: id }));
  },
  setLightboxOpen: (open: boolean) => {
    set((state) => ({ ...state, lightboxOpen: open }));
  },
  setLightboxShowSidepane: (value: boolean) => {
    set(() => ({ lightboxShowSidepane: value }));
  },
  setRenderedBookmarks: (categoryId: string, bookmarks: SingleListData[]) => {
    set((state) => ({
      renderedBookmarks: {
        ...state.renderedBookmarks,
        [categoryId]: bookmarks,
      },
    }));
  },
  setSearchText: (value: string) => {
    set(() => ({ searchText: value }));
  },
  setSelectedVideoId: (value: null | number) => {
    set(() => ({ selectedVideoId: value }));
  },
  setShareCategoryId: (id: number | undefined) => {
    set(() => ({ shareCategoryId: id }));
  },
  setTriggerHeadingEdit: (value: boolean) => {
    set(() => ({ triggerHeadingEdit: value }));
  },
  shareCategoryId: undefined,
  triggerHeadingEdit: false,
}));

export const useSupabaseSession = create<SupabaseSessionStore>((set) => ({
  session: undefined,
  setSession: (value) => {
    set(() => ({ session: value }));
  },
}));
