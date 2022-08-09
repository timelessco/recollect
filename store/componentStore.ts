import create from 'zustand';
import { ModalStoreState } from '../types/componentStoreTypes';

export const useModalStore = create<ModalStoreState>((set) => ({
  showAddCategoryModal: false,
  toggleAddCategoryModal: () =>
    set((state) => ({
      showAddCategoryModal: !state.showAddCategoryModal,
    })),
}));
