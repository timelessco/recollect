export interface ModalStoreState {
  showShareCategoryModal: boolean;
  toggleShareCategoryModal: () => void;
  showAddBookmarkShortcutModal: boolean;
  toggleShowAddBookmarkShortcutModal: () => void;
  showDeleteBookmarkWarningModal: boolean;
  toggleShowDeleteBookmarkWarningModal: () => void;
  showClearTrashWarningModal: boolean;
  toggleShowClearTrashWarningModal: () => void;
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

export interface BookmarkCardViewState {
  moodboardColumns: number[] | number;
  setMoodboardColumns: (value: number[] | number) => void;
  cardContentViewArray: string[];
  setCardContentViewArray: (arr: string[]) => void;
}
