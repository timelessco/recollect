import create from 'zustand';
import {
  ModalStoreState,
  LoadersStoreState,
} from '../types/componentStoreTypes';

export const useModalStore = create<ModalStoreState>((set) => ({
  showAddCategoryModal: false,
  toggleAddCategoryModal: () =>
    set((state) => ({
      showAddCategoryModal: !state.showAddCategoryModal,
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
