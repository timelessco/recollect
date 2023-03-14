import type {
  PostgrestError,
  Session,
  UserIdentity,
} from "@supabase/supabase-js";
import type { NextApiRequest } from "next";

import type {
  BookmarksSortByTypes,
  BookmarksViewTypes,
} from "./componentStoreTypes";

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
  user_id: { id: string; email: string; profile_pic?: string | null };
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
  // email: {
  //   email: string;
  //   profile_pic: string | null;
  // };
  email: string;
  edit_access: boolean;
  user_id: string;
  category_views: BookmarkViewDataTypes;
  is_accept_pending: boolean;
}

export interface CollabDataInCategory {
  userEmail: string;
  edit_access: boolean;
  share_id: number | null; // it will be null for owner
  isOwner: boolean;
  is_accept_pending: boolean;
  profile_pic: string | null;
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

export interface UserProfilePicTypes {
  profile_pic: string | null;
}

// NEXT API types
export type NextAPIReq<T> = Omit<NextApiRequest, "body"> & {
  body: T & { access_token: string };
};

// CRUD types

export interface AddBookmarkMinDataPayloadTypes {
  url: string;
  category_id: number | string | null;
  update_access: boolean;
  session: SupabaseSessionType;
}

export interface AddBookmarkScreenshotPayloadTypes {
  url: string;
  id: number;
  session: SupabaseSessionType;
}

export interface ClearBookmarksInTrashApiPayloadTypes {
  user_id: string | undefined;
  session: SupabaseSessionType;
}

export interface DeleteDataApiPayload {
  id: number;
  session: SupabaseSessionType;
}

export interface MoveBookmarkToTrashApiPayload {
  data: SingleListData;
  isTrash: boolean;
  session: SupabaseSessionType;
}

export interface AddCategoryToBookmarkApiPayload {
  category_id: number | null;
  bookmark_id: number;
  update_access: boolean;
  session: SupabaseSessionType;
}

export interface AddUserCategoryApiPayload {
  user_id: string;
  name: string;
  category_order: number[];
  session: SupabaseSessionType;
}

export interface DeleteUserCategoryApiPayload {
  category_id: number;
  category_order: number[];
  session: SupabaseSessionType;
}

export interface UpdateCategoryOrderApiPayload {
  order: number[];
  session: SupabaseSessionType;
}

export interface UpdateCategoryApiPayload {
  category_id: number | null | string;
  updateData: {
    is_public?: boolean;
    icon?: null | string;
    category_views?: BookmarkViewDataTypes;
  };
  session: SupabaseSessionType;
}

export interface UpdateUserProfileApiPayload {
  id: string;
  updateData: ProfilesTableTypes;
  session: SupabaseSessionType;
}

export interface GetUserProfilePicPayload {
  email: string;
  session: SupabaseSessionType;
}

export interface DeleteSharedCategoriesUserApiPayload {
  id: number;
  session: SupabaseSessionType;
}

export interface SendCollaborationEmailInviteApiPayload {
  emailList: Array<string>;
  category_id: number;
  edit_access: boolean;
  hostUrl: string;
  userId: string;
  session: SupabaseSessionType;
}

export interface UpdateSharedCategoriesUserAccessApiPayload {
  id: number;
  updateData: { edit_access?: boolean; category_views?: BookmarkViewDataTypes };
  session: SupabaseSessionType;
}

export interface AddTagToBookmarkApiPayload {
  selectedData: Array<BookmarksTagData> | BookmarksTagData;
  session: SupabaseSessionType;
}

export interface AddUserTagsApiPayload {
  userData: UserIdentity;
  tagsData: { name: string };
  session: SupabaseSessionType;
}
