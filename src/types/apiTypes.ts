import type { NextApiRequest as NextJsApiRequest } from "next";

import type { BookmarksSortByTypes, BookmarksViewTypes } from "./componentStoreTypes";
import type { CategoryIdUrlTypes, FileType } from "./componentTypes";
import type { StructuredKeywords } from "@/async/ai/schemas/image-analysis-schema";
import type { PostgrestError, User } from "@supabase/supabase-js";

export interface SupabaseSessionType {
  user: null | User;
}
export type CookiesType = Partial<Record<string, string>>;
export interface ImgMetadataType {
  additionalImages?: string[];
  additionalVideos?: string[];
  coverImage: null | string;
  favIcon: null | string;
  height: null | number;
  iframeAllowed: boolean | null;
  image_caption: null | string;
  image_keywords?: Record<string, string> | string[] | StructuredKeywords;
  img_caption: null | string;
  isOgImagePreferred: boolean;
  isPageScreenshot: boolean | null;
  mediaType: null | string;
  ocr: null | string;
  ocr_status?: "limit_reached" | "no_text" | "success";
  ogImgBlurUrl: null | string;
  screenshot: null | string;
  twitter_avatar_url: null | string;
  video_url: null | string;
  width: null | number;
}

export interface SingleListData {
  /**
   * Array of categories (many-to-many)
   */
  addedCategories?: CategoriesData[];
  addedTags: (TempTag | UserTagsData)[];
  description: string;
  id: number;
  inserted_at: string;
  make_discoverable: null | string;
  meta_data: ImgMetadataType;
  ogImage: string;
  ogimage?: string;
  screenshot: string;
  title: string;
  trash: null | string;
  type: string;
  url: string;
  user_id: Pick<ProfilesTableTypes, "id" | "profile_pic">;
}

export interface BookmarksCountTypes {
  audio: number;
  categoryCount: { category_id: number; count: number }[];
  documents: number;
  everything: number;
  images: number;
  instagram: number;
  links: number;
  trash: number;
  tweets: number;
  uncategorized: number;
  videos: number;
}

export interface FetchDataResponse<T = SingleListData[]> {
  data: T;
  error: null | PostgrestError;
}

export interface UrlData {
  description: string;
  id?: number;
  ogImage: string;
  screenshot: string;
  title: string;
  url: string;
  user_id: string;
}

export interface UserTagsData {
  bookmark_tag_id: number;
  created_at: string;
  id: number;
  name: string;
  user_id: string;
}

/**
 * Minimal tag type for optimistic updates.
 * Contains only the fields set during temporary tag creation.
 */
export interface TempTag {
  id: number;
  name: string;
}

export interface FetchUserTagsDataResponse {
  data: UserTagsData[];
  error: null | PostgrestError;
}

export interface BookmarksTagData {
  bookmark_id: number;
  bookmark_tag_id: number;
  created_at?: string;
  id?: number;
  tag_id: number;
  user_id: string;
}

// Junction table type for many-to-many bookmark-category relationship
export interface BookmarksCategoryData {
  bookmark_id: number;
  category_id: number;
  created_at: string;
  id: number;
  user_id: string;
}

export interface FetchBookmarksTagDataResponse {
  data: BookmarksTagData[];
  error: null | PostgrestError;
}

export interface BookmarkViewDataTypes {
  bookmarksView: BookmarksViewTypes;
  cardContentViewArray: string[];
  moodboardColumns: number[];
  sortBy: BookmarksSortByTypes;
}

/**
 * Profile bookmarks_view: keyed by page slug (everything, discover, images, …).
 */
export type ProfilesBookmarksView = Record<string, BookmarkViewDataTypes>;

// user catagories

export interface CategoriesData {
  category_name: string;
  category_slug: string;
  category_views: BookmarkViewDataTypes;
  collabData: [] | CollabDataInCategory[];
  created_at: string;
  icon: null | string;
  icon_color: string;
  id: number;
  /**
   * @deprecated Legacy compat for old mobile builds. Remove when old builds are no longer supported.
   */
  is_favorite?: boolean;
  is_public: boolean;
  user_id: Pick<ProfilesTableTypes, "email" | "id" | "profile_pic" | "user_name">;
}

export interface FetchCategoriesDataResponse {
  data: CategoriesData[];
  error: null | PostgrestError;
}

// shared categories
export interface FetchSharedCategoriesData {
  category_id: number;
  category_views: BookmarkViewDataTypes;
  created_at: string;
  edit_access: boolean;
  // email: {
  //   email: string;
  //   profile_pic: string | null;
  // };
  email: string;
  id: number;
  is_accept_pending: boolean;
  user_id: string;
}

export interface CollabDataInCategory {
  edit_access: boolean;
  is_accept_pending: boolean;
  // it will be null for owner
  isOwner: boolean;
  profile_pic: null | string;
  share_id: null | number;
  userEmail: string;
}

// profiles table

export interface AiFeaturesToggle {
  ai_summary?: boolean;
  auto_assign_collections?: boolean;
  image_keywords?: boolean;
  ocr?: boolean;
}

export interface ProfilesTableTypes {
  ai_features_toggle: AiFeaturesToggle;
  bookmarks_view: ProfilesBookmarksView;
  category_order: number[];
  display_name: string;
  email: string;
  favorite_categories: number[];
  id: string;
  last_synced_instagram_id: null | string;
  last_synced_twitter_id: null | string;
  plan: string;
  preferred_og_domains?: null | string[];
  profile_pic: string;
  provider: null | string;
  user_name: string;
}

export interface ProfilesTableForPayloadTypes {
  ai_features_toggle?: AiFeaturesToggle;
  bookmarks_view?: ProfilesBookmarksView;
  category_order?: number[];
  display_name?: string;
  email?: string;
  favorite_categories?: number[];
  id?: string;
  last_synced_instagram_id?: null | string;
  last_synced_twitter_id?: null | string;
  preferred_og_domains?: null | string[];
  profile_pic?: string;
  provider?: ProfilesTableTypes["provider"];
  user_name?: string;
}

export type BookmarksWithTagsWithTagForginKeys = {
  bookmark_id: number;
  tag_id: { id: number; name: string };
}[];

export type BookmarksWithCategoriesWithCategoryForeignKeys = {
  bookmark_id: number;
  category_id: {
    category_name: string;
    category_slug: string;
    icon: null | string;
    icon_color: string;
    id: number;
  };
}[];

export interface UserProfilePicTypes {
  profile_pic: null | string;
}

// file upload

export interface UploadFileApiResponse {
  data?: ({ id: SingleListData["id"] } | null)[] | null;
  error: Error | null | PostgrestError | string;
  success: boolean;
}

// settings

export interface UploadProfilePicApiResponse {
  error: Error | null | PostgrestError | string;
  success: boolean;
}

// NEXT API types
export type NextApiRequest<T> = Omit<NextJsApiRequest, "body"> & {
  body: T & { access_token: string };
};

// CRUD types

export interface AddBookmarkMinDataPayloadTypes {
  category_id: null | number | string;
  update_access: boolean;
  url: string;
}

export interface AddBookmarkRemainingDataPayloadTypes {
  favIcon: string;
  id: SingleListData["id"];
  url: SingleListData["url"];
  user_id: SingleListData["user_id"]["id"];
}

export interface AddBookmarkScreenshotPayloadTypes {
  id: number;
  url: string;
}

export interface DeleteDataApiPayload {
  id: number;
  session: SupabaseSessionType;
}

export interface MoveBookmarkToTrashApiPayload {
  data: SingleListData[];
  isTrash: boolean;
}

export interface DeleteUserCategoryApiPayload {
  category_id: number;
  keep_bookmarks?: boolean;
}

export interface UpdateCategoryOrderApiPayload {
  order: number[];
}

export interface UpdateUserProfileApiPayload {
  updateData: ProfilesTableForPayloadTypes;
}

export interface UpdateUsernameApiPayload {
  id: string;
  username: ProfilesTableTypes["user_name"];
}

export type DeleteUserApiPayload = Record<string, never>;

export interface RemoveUserProfilePicPayload {
  id: string;
}

export interface GetUserProfilePicPayload {
  email: string;
}

export interface DeleteSharedCategoriesUserApiPayload {
  id: number;
  session: SupabaseSessionType;
}

export interface SendCollaborationEmailInviteApiPayload {
  category_id: number;
  edit_access: boolean;
  emailList: string[];
  hostUrl: string;
  session: SupabaseSessionType;
  userId: string;
}

export interface UpdateSharedCategoriesUserAccessApiPayload {
  id: number;
  updateData: { category_views?: BookmarkViewDataTypes; edit_access?: boolean };
}

export interface UploadFileApiPayload {
  category_id: CategoryIdUrlTypes;
  file: FileType;
  thumbnailPath: null | string;
  // this is the path where the file in uploaded storage
  uploadFileNamePath: string;
}

export interface DeleteBookmarkPayload {
  deleteData: {
    id: SingleListData["id"];
  }[];
}

export interface UploadProfilePicPayload {
  file: FileType;
}

type DataResponse = null | SingleListData[];
type ErrorResponse = null | PostgrestError | string;

export interface GetPublicCategoryBookmarksApiResponseType {
  category_name: CategoriesData["category_name"] | null;
  category_views: BookmarkViewDataTypes | null;
  data: DataResponse;
  error: ErrorResponse;
  icon: CategoriesData["icon"] | null;
  icon_color: CategoriesData["icon_color"] | null;
  is_public: CategoriesData["is_public"] | null;
}

// common types used in next js API

export type FileNameType = string | undefined;

export interface ParsedFormDataType {
  fields: {
    category_id?: string;
    name?: string;
    thumbnailPath?: UploadFileApiPayload["thumbnailPath"];
    type?: string;
    uploadFileNamePath?: string;
    user_id?: string;
  };
  files: {
    file?: {
      filepath?: string;
      mimetype: string;
      originalFilename?: FileNameType;
    }[];
  };
}

// Shared type for paginated bookmarks data structure in React Query cache
export interface PaginatedBookmarks {
  pages: SingleListData[][];
}
