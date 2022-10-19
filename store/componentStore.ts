import create from 'zustand';
import {
  ModalStoreState,
  LoadersStoreState,
  MiscellaneousStoreState,
  BookmarkCardViewState,
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

// TODO: remove this and user react-query loader
export const useLoadersStore = create<LoadersStoreState>((set) => ({
  isAddBookmarkModalButtonLoading: false,
  isDeleteBookmarkLoading: false,
  toggleIsAddBookmarkModalButtonLoading: () =>
    set((state) => ({
      isAddBookmarkModalButtonLoading: !state.isAddBookmarkModalButtonLoading,
    })),
  toggleIsDeleteBookmarkLoading: () =>
    set((state) => ({
      isDeleteBookmarkLoading: !state.isDeleteBookmarkLoading,
    })),
}));

export const useMiscellaneousStore = create<MiscellaneousStoreState>((set) => ({
  shareCategoryId: undefined,
  setShareCategoryId: (id: number) => set(() => ({ shareCategoryId: id })),
}));

export const useBookmarkCardViewState = create<BookmarkCardViewState>(
  (set) => ({
    moodboardColumns: [30],
    setMoodboardColumns: (value: number[] | number) =>
      set(() => ({ moodboardColumns: value })),
    cardContentViewArray: ['cover'],
    setCardContentViewArray: (arr: string[]) =>
      set(() => ({ cardContentViewArray: arr })),
  })
);
