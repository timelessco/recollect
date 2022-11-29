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
  isSortByLoading: boolean;
  toggleIsSortByLoading: () => void;
}

export interface MiscellaneousStoreState {
  shareCategoryId: number | undefined;
  setShareCategoryId: (id: number) => void;
  searchText: string;
  setSearchText: (value: string) => void;
}

export type BookmarksViewTypes = 'card' | 'moodboard' | 'list' | 'headlines';
export type BookmarkViewCategories = 'view' | 'info' | 'colums' | 'sort';
export type BookmarksSortByTypes =
  | 'date-sort-acending'
  | 'date-sort-decending'
  | 'alphabetical-sort-acending'
  | 'alphabetical-sort-decending'
  | 'url-sort-acending'
  | 'url-sort-decending';

// export interface BookmarkCardViewState {
//   moodboardColumns: number[] | number;
//   setMoodboardColumns: (value: number[] | number) => void;
//   cardContentViewArray: string[];
//   setCardContentViewArray: (arr: string[]) => void;
//   bookmarksView: BookmarksViewTypes;
//   setBookmarksView: (value: BookmarksViewTypes) => void;
//   sortBy: BookmarksSortByTypes;
//   setSortBy: (value: BookmarksSortByTypes) => void;
// }
