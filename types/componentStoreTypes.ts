export interface ModalStoreState {
  showAddCategoryModal: boolean;
  showShareCategoryModal: boolean;
  toggleAddCategoryModal: () => void;
  toggleShareCategoryModal: () => void;
}

export interface LoadersStoreState {
  isAddBookmarkModalButtonLoading: boolean;
  isDeleteBookmarkLoading: boolean;
  addBookmarkMinDataLoading: boolean;
  toggleIsAddBookmarkModalButtonLoading: () => void;
  toggleIsDeleteBookmarkLoading: () => void;
  toggleAddBookmarkMinDataLoading: () => void;
}

export interface MiscellaneousStoreState {
  shareCategoryId: number | undefined;
  setShareCategoryId: (id: number) => void;
}
