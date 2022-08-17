export interface ModalStoreState {
  showAddCategoryModal: boolean;
  toggleAddCategoryModal: () => void;
}

export interface LoadersStoreState {
  isAddBookmarkModalButtonLoading: boolean;
  isDeleteBookmarkLoading: boolean;
  toggleIsAddBookmarkModalButtonLoading: () => void;
  toggleIsDeleteBookmarkLoading: () => void;
}
