import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { isNil } from "lodash";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import type {
  AddBookmarkMinDataPayloadTypes,
  AddBookmarkScreenshotPayloadTypes,
  BookmarksCountTypes,
  BookmarksPaginatedDataTypes,
  BookmarkViewDataTypes,
  CategoriesData,
  DeleteBookmarkPayload,
  DeleteUserCategoryApiPayload,
  FetchDataResponse,
  FetchSharedCategoriesData,
  GetUserProfilePicPayload,
  MoveBookmarkToTrashApiPayload,
  ProfilesTableTypes,
  RemoveUserProfilePicPayload,
  SingleListData,
  SupabaseSessionType,
  UpdateCategoryOrderApiPayload,
  UpdateSharedCategoriesUserAccessApiPayload,
  UpdateUsernameApiPayload,
  UpdateUserProfileApiPayload,
  UploadFileApiPayload,
  UploadFileApiResponse,
  UploadProfilePicApiResponse,
  UploadProfilePicPayload,
  UserProfilePicTypes,
  UserTagsData,
} from "../../types/apiTypes";
import type { BookmarksSortByTypes } from "../../types/componentStoreTypes";
import type { CategoryIdUrlTypes } from "../../types/componentTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import { handleClientError } from "@/utils/error-utils/client";

import {
  ADD_BOOKMARK_MIN_DATA,
  ADD_URL_SCREENSHOT_API,
  CLEAR_BOOKMARK_TRASH_API,
  DELETE_API_KEY_API,
  DELETE_BOOKMARK_DATA_API,
  DELETE_SHARED_CATEGORIES_USER_API,
  DELETE_USER_API,
  DELETE_USER_CATEGORIES_API,
  FETCH_BOOKMARK_BY_ID_API,
  FETCH_BOOKMARKS_COUNT,
  FETCH_BOOKMARKS_DATA_API,
  FETCH_BOOKMARKS_VIEW,
  FETCH_SHARED_CATEGORIES_DATA_API,
  FETCH_USER_CATEGORIES_API,
  FETCH_USER_PROFILE_API,
  FETCH_USER_PROFILE_PIC_API,
  FETCH_USER_TAGS_API,
  GET_API_KEY_API,
  GET_MEDIA_TYPE_API,
  getBaseUrl,
  MOVE_BOOKMARK_TO_TRASH_API,
  NEXT_API_URL,
  NO_BOOKMARKS_ID_ERROR,
  PAGINATION_LIMIT,
  REMOVE_PROFILE_PIC_API,
  SAVE_API_KEY_API,
  SEARCH_BOOKMARKS,
  SEND_COLLABORATION_EMAIL_API,
  UPDATE_CATEGORY_ORDER_API,
  UPDATE_SHARED_CATEGORY_USER_ROLE_API,
  UPDATE_USER_PROFILE_API,
  UPDATE_USERNAME_API,
  UPLOAD_FILE_API,
  UPLOAD_PROFILE_PIC_API,
  GEMINI_MODEL,
} from "../../utils/constants";
// eslint-disable-next-line import/no-cycle -- circular dep between helpers and supabaseCrudHelpers needs structural refactor
import { isUserInACategory, parseUploadFileName } from "../../utils/helpers";

// bookmark
// get bookmark by id
export const fetchBookmarkById = async (id: string) => {
  try {
    if (!id) {
      throw new Error(NO_BOOKMARKS_ID_ERROR);
    }

    const response = await axios.get<{ data: SingleListData }>(
      `${NEXT_API_URL}${FETCH_BOOKMARK_BY_ID_API}${id}`,
    );
    return response?.data;
  } catch (error) {
    return error;
  }
};

// user settings and keys
export const saveApiKey = async ({
  apikey,
}: {
  apikey: string;
}): Promise<{ data: unknown; message: string }> => {
  try {
    const response = await axios.post<{ data: unknown; message: string }>(
      `${NEXT_API_URL}${SAVE_API_KEY_API}`,
      { apikey },
    );

    return response?.data;
  } catch {
    throw new Error("Invalid API key");
  }
};

export const deleteApiKey = async (): Promise<{
  data: unknown;
  message: string;
}> => {
  try {
    const response = await axios.delete<{ data: unknown; message: string }>(
      `${NEXT_API_URL}${DELETE_API_KEY_API}`,
    );

    return response?.data;
  } catch {
    throw new Error("Failed to delete API key");
  }
};

interface GetApiKeyResponse {
  data: { apiKey: string } | null;
}

export const getGeminiApiKey = async (): Promise<GetApiKeyResponse> => {
  try {
    const response = await axios.get<GetApiKeyResponse>(`${NEXT_API_URL}${GET_API_KEY_API}`);

    return { data: response.data.data };
  } catch (error) {
    handleClientError(error, "Failed to get API key try again later ");
    return { data: null };
  }
};

// bookmark
// gets bookmarks data
export const fetchBookmarksData = async (
  {
    pageParam: pageParameter = 0,
    queryKey,
  }: // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  QueryFunctionContext<(null | number | string | undefined)[], any>,
  session: SupabaseSessionType,
  sortBy: BookmarksSortByTypes,
) => {
  const categoryId = !isEmpty(queryKey) && queryKey?.length <= 4 ? queryKey[2] : null;

  const userId = !isEmpty(queryKey) && queryKey?.length <= 5 ? queryKey[1] : null;

  if (!userId) {
    return { count: {}, data: [], error: null } as unknown as FetchDataResponse;
  }

  if (!session?.user) {
    return;
  }

  if (!sortBy) {
    return;
  }

  try {
    const bookmarksData = await axios.get<{
      count: BookmarksCountTypes;
      data: { data: SingleListData[] };
    }>(
      `${NEXT_API_URL}${FETCH_BOOKMARKS_DATA_API}?category_id=${
        isNull(categoryId) ? "null" : categoryId
      }&from=${pageParameter as string}&sort_by=${sortBy}`,
    );

    return {
      count: bookmarksData?.data?.count,
      data: bookmarksData?.data?.data,
      error: null,
    } as unknown as FetchDataResponse;
  } catch (error) {
    return { data: undefined, error } as unknown as FetchDataResponse;
  }
};

export const getBookmarksCount = async (
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  queryData: QueryFunctionContext<QueryKey, any>,
  session: SupabaseSessionType,
): Promise<{ data: BookmarksCountTypes | null; error: Error }> => {
  const userId =
    !isEmpty(queryData?.queryKey) && queryData?.queryKey?.length < 4
      ? queryData?.queryKey[1]
      : undefined;

  if (!session?.user) {
    return {
      data: null,
      error: { message: "No user session", name: "No user session" },
    };
  }

  if (userId) {
    try {
      const bookmarksData = await axios.get<{
        data: BookmarksCountTypes;
        error: Error;
      }>(`${NEXT_API_URL}${FETCH_BOOKMARKS_COUNT}`);

      return bookmarksData?.data;
    } catch (error_) {
      const error = error_ as Error;
      return { data: null, error };
    }
  } else {
    // return undefined;
    return { data: null, error: { message: "NO user id", name: "NO user id" } };
  }
};

export const addBookmarkMinData = async ({
  category_id,
  update_access,
  url,
}: AddBookmarkMinDataPayloadTypes) => {
  try {
    // append https here
    let finalUrl = url;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = `https://${url}`;
    }

    const apiResponse = await axios.post(`${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA}`, {
      category_id: isNull(category_id) ? 0 : category_id,
      update_access,
      url: finalUrl,
    });

    return apiResponse as { data: { data: SingleListData[] } };
  } catch (error) {
    return error;
  }
};

export const addBookmarkScreenshot = async ({ id, url }: AddBookmarkScreenshotPayloadTypes) => {
  try {
    const apiResponse = await axios.post(`${NEXT_API_URL}${ADD_URL_SCREENSHOT_API}`, { id, url });

    return apiResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      throw new Error(error.message, { cause: error });
    }

    return error;
  }
};

export const deleteData = async (item: DeleteBookmarkPayload) => {
  try {
    const response = await axios.post(`${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`, {
      deleteData: item?.deleteData,
    });

    return response;
  } catch (error) {
    return error;
  }
};

export const moveBookmarkToTrash = async ({ data, isTrash }: MoveBookmarkToTrashApiPayload) => {
  try {
    // Only send bookmark IDs to the API - full data is only needed client-side for optimistic updates
    const minimalData = data.map((bookmark) => ({ id: bookmark.id }));

    const response = await axios.post(`${NEXT_API_URL}${MOVE_BOOKMARK_TO_TRASH_API}`, {
      data: minimalData,
      isTrash,
    });

    return response;
  } catch (error) {
    return error;
  }
};

export const clearBookmarksInTrash = async () => {
  try {
    const response = await axios.post(`${NEXT_API_URL}${CLEAR_BOOKMARK_TRASH_API}`, {});

    return response;
  } catch (error) {
    return error;
  }
};

export const searchBookmarks = async (
  searchText: string,
  category_id: CategoryIdUrlTypes,
  isSharedCategory: boolean,
  offset = 0,
  limit = PAGINATION_LIMIT,
): Promise<{
  data: BookmarksPaginatedDataTypes[] | null;
  error: Error | null;
}> => {
  if (!isEmpty(searchText) && searchText !== "#") {
    const categoryId = !isNull(category_id) ? category_id : "null";

    // directly using '#' in the params might cause issues
    const parameters = new URLSearchParams({
      category_id: String(categoryId ?? ""),
      is_shared_category: String(isSharedCategory ?? ""),
      limit: String(limit ?? PAGINATION_LIMIT),
      offset: String(offset ?? 0),
      search: searchText ?? "",
    });

    try {
      const response = await axios.get<{
        data: BookmarksPaginatedDataTypes[];
        error: Error | null;
      }>(`${NEXT_API_URL}${SEARCH_BOOKMARKS}?${parameters.toString()}`);
      return response?.data;
    } catch (error_) {
      const error = error_ as Error;
      return { data: null, error };
    }
  }

  return {
    data: null,
    error: { message: "No search text provided", name: "error" },
  };
};

// user tags
export const fetchUserTags = async (): Promise<{
  data: null | UserTagsData[];
  error: Error;
}> => {
  try {
    const response = await axios.get<{ data: UserTagsData[]; error: Error }>(
      `${NEXT_API_URL}${FETCH_USER_TAGS_API}`,
    );
    return response?.data;
  } catch (error_) {
    const error = error_ as Error;
    return { data: null, error };
  }
};

export const fetchBookmarksViews = async ({
  category_id,
}: {
  category_id: null | number | string;
}): Promise<{ data: BookmarkViewDataTypes | null; error: Error }> => {
  if (!isUserInACategory(category_id as string)) {
    return {
      data: null,
      error: { message: "user not in category", name: "user not in category" },
    };
  }

  if (isNull(category_id)) {
    return {
      data: null,
      error: {
        message: "no access token and category id is null",
        name: "no access token and category id is nul",
      },
    };
  }

  try {
    const response = await axios.post<{
      data: BookmarkViewDataTypes | null;
      error: Error;
    }>(`${NEXT_API_URL}${FETCH_BOOKMARKS_VIEW}`, {
      category_id: isNull(category_id) ? 0 : category_id,
    });
    return response?.data;
  } catch (error_) {
    const error = error_ as Error;
    return { data: null, error };
  }
};

// user categories

export const fetchCategoriesData = async (): Promise<{
  data: CategoriesData[] | null;
  error: Error;
}> => {
  try {
    const response = await axios.get<{
      data: CategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${FETCH_USER_CATEGORIES_API}`);

    return response.data;
  } catch (error_) {
    const error = error_ as Error;
    return { data: null, error };
  }
};

export const deleteUserCategory = async ({
  category_id,
  keep_bookmarks,
}: DeleteUserCategoryApiPayload) => {
  try {
    const response = await axios.post<{
      data: CategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${DELETE_USER_CATEGORIES_API}`, {
      category_id,
      keep_bookmarks,
    });
    return response?.data;
  } catch (error) {
    return error;
  }
};

export const updateCategoryOrder = async ({ order }: UpdateCategoryOrderApiPayload) => {
  try {
    const response = await axios.post(`${NEXT_API_URL}${UPDATE_CATEGORY_ORDER_API}`, {
      category_order: order,
    });

    return response;
  } catch (error) {
    return error;
  }
};

// share
export const sendCollaborationEmailInvite = async ({
  category_id,
  edit_access,
  emailList,
  hostUrl,
}: {
  category_id: number;
  edit_access: boolean;
  emailList: string[];
  hostUrl: string;
}) => {
  const response = await axios.post(`${NEXT_API_URL}${SEND_COLLABORATION_EMAIL_API}`, {
    category_id,
    edit_access,
    emailList,
    hostUrl,
  });

  return response;
};

export const fetchSharedCategoriesData = async (): Promise<{
  data: FetchSharedCategoriesData[] | null;
  error: Error;
}> => {
  try {
    const response = await axios.get<{
      data: FetchSharedCategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${FETCH_SHARED_CATEGORIES_DATA_API}`);

    return response?.data;
  } catch (error) {
    const catchError = error as Error;
    return { data: null, error: catchError };
  }
};

export const deleteSharedCategoriesUser = async ({ id }: { id: number }) => {
  try {
    const response = await axios.post<{
      data: FetchSharedCategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${DELETE_SHARED_CATEGORIES_USER_API}`, { id });

    return response?.data;
  } catch (error) {
    return error;
  }
};

export const updateSharedCategoriesUserAccess = async ({
  id,
  updateData,
}: UpdateSharedCategoriesUserAccessApiPayload) => {
  try {
    const response = await axios.post<{
      data: FetchSharedCategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${UPDATE_SHARED_CATEGORY_USER_ROLE_API}`, {
      id,
      updateData,
    });

    return response?.data;
  } catch (error) {
    return error;
  }
};

// profiles
export const fetchUserProfiles = async ({
  session,
  userId,
}: {
  session: SupabaseSessionType;
  userId: string;
}): Promise<{ data: null | ProfilesTableTypes[]; error: Error }> => {
  const existingOauthAvatarUrl = session?.user?.user_metadata?.avatar_url;

  try {
    if (userId) {
      const response = await axios.get<{
        data: null | ProfilesTableTypes[];
        error: Error;
      }>(
        `${NEXT_API_URL}${FETCH_USER_PROFILE_API}?${
          !isNil(existingOauthAvatarUrl) ? `&avatar=${existingOauthAvatarUrl}` : ``
        }`,
      );
      return response?.data;
    }

    return { data: null, error: { message: "No user id", name: "No user id" } };
  } catch (error_) {
    const error = error_ as Error;
    return { data: null, error };
  }
};

export const updateUserProfile = async ({ updateData }: UpdateUserProfileApiPayload) => {
  try {
    const response = await axios.post<{
      data: null | ProfilesTableTypes[];
      error: Error;
    }>(`${NEXT_API_URL}${UPDATE_USER_PROFILE_API}`, { updateData });

    return response?.data;
  } catch (error) {
    return error;
  }
};

export const updateUsername = async ({ id, username }: UpdateUsernameApiPayload) => {
  try {
    const response = await axios.post<{
      data: null | ProfilesTableTypes[];
      error: Error;
    }>(`${NEXT_API_URL}${UPDATE_USERNAME_API}`, { id, username });

    return response?.data;
  } catch (error) {
    return error;
  }
};

export const deleteUser = async () => {
  try {
    const response = await axios.post<{
      data: null | ProfilesTableTypes[];
      error: Error;
    }>(`${NEXT_API_URL}${DELETE_USER_API}`, {});

    return response?.data;
  } catch (error) {
    return error;
  }
};

export const getUserProfilePic = async ({
  email,
}: GetUserProfilePicPayload): Promise<{
  data: null | UserProfilePicTypes[];
  error: Error;
}> => {
  if (!isNil(email) && !isEmpty(email)) {
    try {
      const response = await axios.get<{
        data: null | UserProfilePicTypes[];
        error: Error;
      }>(`${NEXT_API_URL}${FETCH_USER_PROFILE_PIC_API}?email=${email}`);

      return response?.data;
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  return { data: null, error: "Email not present" as unknown as Error };
};

export const removeUserProfilePic = async ({ id }: RemoveUserProfilePicPayload) => {
  try {
    const response = await axios.post<{
      data: null | ProfilesTableTypes[];
      error: Error;
    }>(`${NEXT_API_URL}${REMOVE_PROFILE_PIC_API}`, { id });

    return response?.data;
  } catch (error) {
    return error;
  }
};

// file upload

export const uploadFile = async ({
  category_id,
  file,
  thumbnailPath,
  uploadFileNamePath,
}: UploadFileApiPayload) => {
  try {
    const fileName = parseUploadFileName(file?.name);
    const response = await axios.post<UploadFileApiResponse>(
      `${NEXT_API_URL}${UPLOAD_FILE_API}`,
      {
        category_id,
        name: fileName,
        thumbnailPath,
        type: file?.type,
        uploadFileNamePath,
      },
      { headers: { "Content-Type": "application/json" } },
    );
    return response?.data;
  } catch (error) {
    return error;
  }
};

// user settings
export const uploadProfilePic = async ({ file }: UploadProfilePicPayload) => {
  try {
    const response = await axios.post<UploadProfilePicApiResponse>(
      `${NEXT_API_URL}${UPLOAD_PROFILE_PIC_API}`,
      { file },
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return response?.data;
  } catch (error) {
    return error;
  }
};

// auth

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut = async (supabase: SupabaseClient<any, "public", any>) => {
  await supabase.auth.signOut({ scope: "local" });
};

export const getMediaType = async (url: string): Promise<null | string> => {
  try {
    const encodedUrl = encodeURIComponent(url);

    const response = await fetch(
      `${getBaseUrl()}${NEXT_API_URL}${GET_MEDIA_TYPE_API}?url=${encodedUrl}`,
      { method: "GET" },
    );

    if (!response.ok) {
      console.error("Error in getting media type");
      return null;
    }

    const data = (await response.json()) as { mediaType?: string };

    return data.mediaType ?? null;
  } catch (error) {
    console.error("Error getting media type:", error);
    return null;
  }
};

export const validateApiKey = async (apikey: string) => {
  try {
    const genAI = new GoogleGenerativeAI(apikey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
    });

    const prompt = "Hey there!";
    const result = await model.generateContent([prompt]);

    if (!result.response.text()) {
      throw new Error("response not generated");
    }

    return result;
  } catch {
    throw new Error("Invalid API key");
  }
};
