import create from 'zustand';
import {
  ModalStoreState,
  LoadersStoreState,
  MiscellaneousStoreState,
} from '../types/componentStoreTypes';

export const useModalStore = create<ModalStoreState>((set) => ({
  showShareCategoryModal: false,
  toggleShareCategoryModal: () =>
    set((state) => ({
      showShareCategoryModal: !state.showShareCategoryModal,
    })),
  showAddBookmarkShortcutModal: false,
  toggleShowAddBookmarkShortcutModal: () =>
    set((state) => ({
      showAddBookmarkShortcutModal: !state.showAddBookmarkShortcutModal,
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
}));

export const useLoadersStore = create<LoadersStoreState>((set) => ({
  isSortByLoading: false, // this is not handelled by react-query as this is a combination for 2 queries
  toggleIsSortByLoading: () =>
    set((state) => ({
      isSortByLoading: !state.isSortByLoading,
    })),
  sidePaneOptionLoading: null,
  setSidePaneOptionLoading: (value: string | number | null) =>
    set(() => ({
      sidePaneOptionLoading: value,
    })),
}));

export const useMiscellaneousStore = create<MiscellaneousStoreState>((set) => ({
  shareCategoryId: undefined,
  setShareCategoryId: (id: number) => set(() => ({ shareCategoryId: id })),
  searchText: '',
  setSearchText: (value: string) => set(() => ({ searchText: value })),
  addScreenshotBookmarkId: undefined,
  setAddScreenshotBookmarkId: (value: number | undefined) =>
    set(() => ({ addScreenshotBookmarkId: value })),
  isCardDragging: false,
  setIsCardDragging: (value: boolean) => set(() => ({ isCardDragging: value })),
  showSidePane: true,
  setShowSidePane: (value: boolean) => set(() => ({ showSidePane: value })),
}));
