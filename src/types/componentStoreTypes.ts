import type { SingleListData } from "./apiTypes";
import type { User } from "@supabase/supabase-js";

export interface ModalStoreState {
  showVideoModal: boolean;
  toggleShowVideoModal: () => void;
}

export interface LoadersStoreState {
  addAnimatingBookmark: (url: string) => void;
  addLoadingBookmarkId: (id: number) => void;
  animatingBookmarkUrls: Set<string>;
  clearAnimatingBookmarks: () => void;
  isBookmarkAdding: boolean;
  isSearchLoading: boolean;
  isSortByLoading: boolean;
  loadingBookmarkIds: Set<number>;
  removeAnimatingBookmark: (url: string) => void;
  removeLoadingBookmarkId: (id: number) => void;
  setIsBookmarkAdding: (value: boolean) => void;
  toggleIsSearchLoading: (value: boolean) => void;
  toggleIsSortByLoading: () => void;
}

export interface MiscellaneousStoreState {
  addScreenshotBookmarkId: number | undefined;
  currentBookmarkView: BookmarksViewTypes;
  deleteBookmarkId: number[] | undefined;
  isCardDragging: boolean;
  isCollectionChanged: boolean;
  lightboxId: null | string;
  lightboxOpen: boolean;
  lightboxShowSidepane: boolean;
  renderedBookmarks: Record<string, SingleListData[]>;
  searchText: string;
  selectedVideoId: null | number;
  setAddScreenshotBookmarkId: (value: number | undefined) => void;
  setCurrentBookmarkView: (value: BookmarksViewTypes) => void;
  setDeleteBookmarkId: (bookmarkIds: number[]) => void;
  setIsCardDragging: (value: boolean) => void;
  setIsCollectionChanged: (value: boolean) => void;
  setLightboxId: (id: null | string) => void;
  setLightboxOpen: (open: boolean) => void;
  setLightboxShowSidepane: (value: boolean) => void;
  setRenderedBookmarks: (categoryId: string, bookmarks: SingleListData[]) => void;
  setSearchText: (value: string) => void;
  setSelectedVideoId: (id: null | number) => void;
  setShareCategoryId: (id: number | undefined) => void;
  setTriggerHeadingEdit: (value: boolean) => void;
  shareCategoryId: number | undefined;
  triggerHeadingEdit: boolean;
}

export interface SupabaseSessionStore {
  session: { user: null | User } | undefined;
  setSession: (value: SupabaseSessionStore["session"]) => void;
}

export type BookmarksViewTypes = "card" | "list" | "moodboard" | "timeline";
export type BookmarkViewCategories = "columns" | "info" | "sort" | "view";
export type BookmarksSortByTypes =
  | "alphabetical-sort-ascending"
  | "alphabetical-sort-descending"
  | "date-sort-ascending"
  | "date-sort-descending"
  | "url-sort-ascending"
  | "url-sort-descending";

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
