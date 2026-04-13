import { GoogleGenAI } from "@google/genai";
import axios from "axios";

import type {
  AddBookmarkScreenshotPayloadTypes,
  CategoriesData,
  DeleteBookmarkPayload,
  DeleteUserCategoryApiPayload,
  FetchSharedCategoriesData,
  MoveBookmarkToTrashApiPayload,
  ProfilesTableTypes,
  UpdateCategoryOrderApiPayload,
  UpdateSharedCategoriesUserAccessApiPayload,
  UpdateUserProfileApiPayload,
} from "../../types/apiTypes";
import type { GetMediaTypeOutputSchema } from "@/app/api/v2/bookmarks/get/get-media-type/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";

import {
  ADD_URL_SCREENSHOT_API,
  CLEAR_BOOKMARK_TRASH_API,
  DELETE_BOOKMARK_DATA_API,
  DELETE_USER_CATEGORIES_API,
  FETCH_USER_CATEGORIES_API,
  GEMINI_MODEL,
  MOVE_BOOKMARK_TO_TRASH_API,
  NEXT_API_URL,
  UPDATE_CATEGORY_ORDER_API,
  UPDATE_SHARED_CATEGORY_USER_ROLE_API,
  UPDATE_USER_PROFILE_API,
  V2_GET_MEDIA_TYPE_API,
} from "../../utils/constants";
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

// user tags
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

// auth

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut = async (supabase: SupabaseClient<any, "public", any>) => {
  await supabase.auth.signOut({ scope: "local" });
};

type GetMediaTypeResponse = z.infer<typeof GetMediaTypeOutputSchema>;

export const getMediaType = async (url: string): Promise<null | string> => {
  try {
    const data = await api
      .get(V2_GET_MEDIA_TYPE_API, { searchParams: { url } })
      .json<GetMediaTypeResponse>();

    return data.mediaType ?? null;
  } catch {
    return null;
  }
};

export const validateApiKey = async (apikey: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: apikey });
    const response = await ai.models.generateContent({
      contents: ["Hey there!"],
      model: GEMINI_MODEL,
    });

    if (!response.text) {
      throw new Error("response not generated");
    }

    return response;
  } catch (error) {
    throw new Error("Invalid API key", { cause: error });
  }
};
