import create from 'zustand';
import {
  ModalStoreState,
  LoadersStoreState,
  MiscellaneousStoreState,
} from '../types/componentStoreTypes';

export const useModalStore = create<ModalStoreState>((set) => ({
  showAddCategoryModal: false,
  showShareCategoryModal: false,
  toggleAddCategoryModal: () =>
    set((state) => ({
      showAddCategoryModal: !state.showAddCategoryModal,
    })),
  toggleShareCategoryModal: () =>
    set((state) => ({
      showShareCategoryModal: !state.showShareCategoryModal,
    })),
}));

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
