import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { isNil } from "lodash";
import isNull from "lodash/isNull";

import type {
  AddBookmarkMinDataPayloadTypes,
  CategoriesData,
  DeleteBookmarkPayload,
  DeleteUserCategoryApiPayload,
  MoveBookmarkToTrashApiPayload,
  ProfilesTableTypes,
  SingleListData,
  SupabaseSessionType,
  UploadFileApiPayload,
  UploadFileApiResponse,
  UploadProfilePicApiResponse,
  UploadProfilePicPayload,
} from "../../types/apiTypes";
import type { GetMediaTypeOutputSchema } from "@/app/api/v2/bookmarks/get/get-media-type/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";

import {
  ADD_BOOKMARK_MIN_DATA,
  CLEAR_BOOKMARK_TRASH_API,
  DELETE_BOOKMARK_DATA_API,
  DELETE_USER_CATEGORIES_API,
  FETCH_USER_PROFILE_API,
  GEMINI_MODEL,
  MOVE_BOOKMARK_TO_TRASH_API,
  NEXT_API_URL,
  UPLOAD_FILE_API,
  UPLOAD_PROFILE_PIC_API,
  V2_GET_MEDIA_TYPE_API,
} from "../../utils/constants";
// eslint-disable-next-line import/no-cycle -- circular dep between helpers and supabaseCrudHelpers needs structural refactor
import { parseUploadFileName } from "../../utils/helpers";

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

// share

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
