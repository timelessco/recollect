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
}

export interface FetchDataResponse {
  data: SingleListData[];
  error: PostgrestError | null;
}

export interface UrlData {
  title: string;
  url: string;
  description: string;
  ogImage: string;
  user_id: string;
  screenshot: string;
}

export interface UserTagsData {
  created_at: string;
  id: number;
  name: string;
  user_id: string;
}

export interface FetchUserTagsDataResponse {
  data: UserTagsData[];
  error: PostgrestError | null;
}
