import { PostgrestError } from '@supabase/supabase-js';

export interface SingleListData {
  id: number;
  inserted_at: string;
  title: string;
  ogImage: string;
  description: string;
  url: string;
  user_id: string;
  screenshot: string;
  addedTags: Array<UserTagsData>;
  category_id: number;
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

// user catagories

export interface CategoriesData {
  created_at: string;
  id: number;
  category_name: string;
  user_id: string;
  category_slug: string;
  is_public: boolean;
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
}
