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
