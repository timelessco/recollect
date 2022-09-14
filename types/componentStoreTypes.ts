export interface ModalStoreState {
  showAddCategoryModal: boolean;
  showShareCategoryModal: boolean;
  toggleAddCategoryModal: () => void;
  toggleShareCategoryModal: () => void;
  showAddBookmarkShortcutModal: boolean;
  toggleShowAddBookmarkShortcutModal: () => void;
}

export interface LoadersStoreState {
  isAddBookmarkModalButtonLoading: boolean;
  isDeleteBookmarkLoading: boolean;
  toggleIsAddBookmarkModalButtonLoading: () => void;
  toggleIsDeleteBookmarkLoading: () => void;
}

export interface MiscellaneousStoreState {
  shareCategoryId: number | undefined;
  setShareCategoryId: (id: number) => void;
}
