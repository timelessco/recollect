import { PostgrestError, Session } from '@supabase/supabase-js';
import {
  BookmarksSortByTypes,
  BookmarksViewTypes,
} from './componentStoreTypes';

export type SupabaseSessionType = Session | null;
export interface SingleListData {
  id: number;
  inserted_at: string;
  title: string;
  ogImage: string;
  description: string;
  url: string;
  user_id: ProfilesTableTypes;
  screenshot: string;
  addedTags: Array<UserTagsData>;
  category_id: number;
  trash: boolean;
}

export type BookmarksCountTypes = {
  allBookmarks: number;
  trash: number;
  uncategorized: number;
  categoryCount: { category_id: number; count: number }[];
};

export type SingleBookmarksPaginatedDataTypes = {
  data: SingleListData[];
  error: PostgrestError;
  count: BookmarksCountTypes;
};
export interface BookmarksPaginatedDataTypes {
  pages: SingleBookmarksPaginatedDataTypes[];
}

export interface FetchDataResponse<T = SingleListData[]> {
  data: T;
  error: PostgrestError | null;
}

export interface UrlData {
  title: string;
  url: string;
  description: string;
  ogImage: string;
  user_id: string;
  screenshot: string;
  id?: number;
}

export interface UserTagsData {
  created_at: string;
  id: number;
  name: string;
  user_id: string;
  bookmark_tag_id: number;
}

export interface FetchUserTagsDataResponse {
  data: UserTagsData[];
  error: PostgrestError | null;
}

export interface BookmarksTagData {
  id?: number;
  created_at?: string;
  bookmark_id: number;
  tag_id: number;
  user_id: string;
  bookmark_tag_id: number;
}

export interface FetchBookmarksTagDataResponse {
  data: BookmarksTagData[];
  error: PostgrestError | null;
}

export interface BookmarkViewDataTypes {
  bookmarksView: BookmarksViewTypes;
  cardContentViewArray: string[];
  moodboardColumns: number[];
  sortBy: BookmarksSortByTypes;
}

// user catagories

export interface CategoriesData {
  created_at: string;
  id: number;
  category_name: string;
  user_id: { id: string; email: string };
  category_slug: string;
  is_public: boolean;
  icon: null | string;
  collabData: CollabDataInCategory[] | [];
  category_views: BookmarkViewDataTypes;
}

export interface FetchCategoriesDataResponse {
  data: CategoriesData[];
  error: PostgrestError | null;
}

// shared categories
export interface FetchSharedCategoriesData {
  id: number;
  created_at: string;
  category_id: number;
  email: string;
  edit_access: boolean;
  user_id: string;
  category_views: BookmarkViewDataTypes;
}

export interface CollabDataInCategory {
  userEmail: string;
  edit_access: boolean;
  share_id: number | null; // it will be null for owner
  isOwner: boolean;
}

// profiles table

export interface ProfilesTableTypes {
  id?: string;
  email?: string;
  user_name?: string;
  profile_pic?: string;
  bookmarks_view?: BookmarkViewDataTypes;
  category_order?: number[];
}

export type BookmarksWithTagsWithTagForginKeys = {
  bookmark_id: number;
  tag_id: { id: number; name: string };
}[];
