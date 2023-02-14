import type { Provider, SupabaseClient } from "@supabase/supabase-js";
import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import axios from "axios";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import type {
  AddBookmarkMinDataPayloadTypes,
  AddBookmarkScreenshotPayloadTypes,
  AddCategoryToBookmarkApiPayload,
  AddTagToBookmarkApiPayload,
  AddUserTagsApiPayload,
  BookmarksCountTypes,
  BookmarksPaginatedDataTypes,
  BookmarkViewDataTypes,
  CategoriesData,
  ClearBookmarksInTrashApiPayloadTypes,
  DeleteUserCategoryApiPayload,
  FetchDataResponse,
  FetchSharedCategoriesData,
  MoveBookmarkToTrashApiPayload,
  ProfilesTableTypes,
  SingleListData,
  SupabaseSessionType,
  UpdateCategoryApiPayload,
  UpdateCategoryOrderApiPayload,
  UpdateSharedCategoriesUserAccessApiPayload,
  UpdateUserProfileApiPayload,
  UserTagsData,
} from "../types/apiTypes";
import type { CategoryIdUrlTypes } from "../types/componentTypes";
import {
  ADD_BOOKMARK_MIN_DATA,
  ADD_CATEGORY_TO_BOOKMARK_API,
  ADD_TAG_TO_BOOKMARK_API,
  ADD_URL_SCREENSHOT_API,
  CLEAR_BOOKMARK_TRASH_API,
  CREATE_USER_CATEGORIES_API,
  CREATE_USER_TAGS_API,
  DELETE_BOOKMARK_DATA_API,
  DELETE_SHARED_CATEGORIES_USER_API,
  DELETE_USER_CATEGORIES_API,
  FETCH_BOOKMARKS_VIEW,
  FETCH_SHARED_CATEGORIES_DATA_API,
  FETCH_USER_CATEGORIES_API,
  FETCH_USER_PROFILE_API,
  FETCH_USER_TAGS_API,
  GET_BOOKMARKS_COUNT,
  GET_BOOKMARKS_DATA_API,
  MOVE_BOOKMARK_TO_TRASH_API,
  NEXT_API_URL,
  REMOVE_TAG_FROM_BOOKMARK_API,
  SEARCH_BOOKMARKS,
  SEND_COLLABORATION_EMAIL_API,
  UPDATE_CATEGORY_ORDER_API,
  UPDATE_SHARED_CATEGORY_USER_ROLE_API,
  UPDATE_USER_CATEGORIES_API,
  UPDATE_USER_PROFILE_API,
} from "../utils/constants";
import { isUserInACategory } from "../utils/helpers";

// bookmark
// gets bookmarks data
export const fetchBookmakrsData = async (
  {
    pageParam = 0,
    queryKey,
  }: QueryFunctionContext<(string | number | null | undefined)[], any>,
  session: SupabaseSessionType,
) => {
  const categoryId =
    !isEmpty(queryKey) && queryKey?.length <= 3 ? queryKey[2] : null;

  const userId =
    !isEmpty(queryKey) && queryKey?.length <= 4 ? queryKey[1] : null;

  if (!userId) {
    return {
      data: [],
      error: null,
      count: {},
    } as unknown as FetchDataResponse;
  }

  if (!session?.access_token) {
    return undefined;
  }

  try {
    const bookmarksData = await axios.get<{
      data: {
        data: SingleListData[];
      };
      count: BookmarksCountTypes;
    }>(
      `${NEXT_API_URL}${GET_BOOKMARKS_DATA_API}?access_token=${
        session?.access_token
      }&category_id=${
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        isNull(categoryId) ? "null" : categoryId
      }&from=${pageParam as string}`,
    );

    return {
      data: bookmarksData?.data?.data,
      error: null,
      count: bookmarksData?.data?.count,
    } as unknown as FetchDataResponse;
  } catch (e) {
    return { data: undefined, error: e } as unknown as FetchDataResponse;
  }
};

export const getBookmarksCount = async (
  queryData: QueryFunctionContext<QueryKey, any>,
  session: SupabaseSessionType,
): Promise<{
  data: BookmarksCountTypes | null;
  error: Error;
}> => {
  const userId =
    !isEmpty(queryData?.queryKey) && queryData?.queryKey?.length < 4
      ? queryData?.queryKey[1]
      : undefined;

  if (!session?.access_token) {
    return {
      data: null,
      error: { name: "No access Token", message: "No Access token" },
    };
  }

  if (userId) {
    try {
      const bookmarksData = await axios.get<{
        data: BookmarksCountTypes;
        error: Error;
      }>(
        `${NEXT_API_URL}${GET_BOOKMARKS_COUNT}?access_token=${session?.access_token}`,
      );

      return bookmarksData?.data;
    } catch (e) {
      const error = e as Error;
      return {
        data: null,
        error,
      };
    }
  } else {
    // return undefined;
    return {
      data: null,
      error: { name: "NO user id", message: "NO user id" },
    };
  }
};

export const addBookmarkMinData = async ({
  url,
  category_id,
  update_access,
  session,
}: AddBookmarkMinDataPayloadTypes) => {
  try {
    const apiRes = await axios.post(`${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA}`, {
      access_token: session?.access_token,
      url,
      category_id: isNull(category_id) ? 0 : category_id,
      update_access,
    });

    return apiRes as { data: { data: SingleListData[] } };
  } catch (e) {
    return e;
  }
};

export const addBookmarkScreenshot = async ({
  url,
  id,
  session,
}: AddBookmarkScreenshotPayloadTypes) => {
  try {
    const apiRes = await axios.post(
      `${NEXT_API_URL}${ADD_URL_SCREENSHOT_API}`,
      {
        access_token: session?.access_token,
        url,
        id,
      },
    );

    return apiRes;
  } catch (e) {
    return e;
  }
};

export const deleteData = async (item: {
  id: number;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(`${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`, {
      data: { id: item?.id },
      access_token: item?.session?.access_token,
    });

    return res;
  } catch (e) {
    return e;
  }
};

export const moveBookmarkToTrash = async ({
  data,
  isTrash,
  session,
}: MoveBookmarkToTrashApiPayload) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${MOVE_BOOKMARK_TO_TRASH_API}`,
      {
        data,
        isTrash,
        access_token: session?.access_token,
      },
    );

    return res;
  } catch (e) {
    return e;
  }
};

export const clearBookmarksInTrash = async ({
  user_id = undefined,
  session,
}: ClearBookmarksInTrashApiPayloadTypes) => {
  try {
    const res = await axios.post(`${NEXT_API_URL}${CLEAR_BOOKMARK_TRASH_API}`, {
      user_id,
      access_token: session?.access_token,
    });

    return res;
  } catch (e) {
    return e;
  }
};

export const searchBookmarks = async (
  searchText: string,
  category_id: CategoryIdUrlTypes,
  session: SupabaseSessionType,
): Promise<{
  data: BookmarksPaginatedDataTypes[] | null;
  error: Error;
}> => {
  if (!isEmpty(searchText) && searchText !== "#" && !isNull(session)) {
    const accessToken =
      !isNull(session?.access_token) || session?.access_token
        ? session?.access_token
        : "null";

    const categoryId = !isNull(category_id) ? category_id : "null";

    try {
      const res = await axios.get<{
        data: BookmarksPaginatedDataTypes[];
        error: Error;
      }>(
        `${NEXT_API_URL}${SEARCH_BOOKMARKS}?search=${searchText}&access_token=${accessToken}&user_id=${session?.user?.id}&category_id=${categoryId}`,
      );
      return res?.data;
    } catch (e) {
      const error = e as Error;
      return {
        data: null,
        error,
      };
    }
  }

  return {
    data: null,
    error: { name: "error", message: "error" },
  };
};

// user tags
export const fetchUserTags = async (
  user_id: string,
  session: SupabaseSessionType,
): Promise<{ data: UserTagsData[] | null; error: Error }> => {
  if (!session?.access_token) {
    return {
      data: null,
      error: { message: "no access token", name: "no access token" },
    };
  }

  if (user_id && !isEmpty(user_id)) {
    try {
      const res = await axios.get<{ data: UserTagsData[]; error: Error }>(
        `${NEXT_API_URL}${FETCH_USER_TAGS_API}?user_id=${user_id}&access_token=${session?.access_token}`,
      );
      return res?.data;
    } catch (e) {
      const error = e as Error;
      return {
        data: null,
        error,
      };
    }
  }
  return {
    data: null,
    error: { message: "no user id", name: "no user id" },
  };
};

export const addUserTags = async ({
  userData,
  tagsData,
  session,
}: AddUserTagsApiPayload) => {
  try {
    const res = await axios.post<{ data: UserTagsData }>(
      `${NEXT_API_URL}${CREATE_USER_TAGS_API}`,
      {
        name: tagsData?.name,
        user_id: userData?.id,
        access_token: session?.access_token,
      },
    );
    return res?.data;
  } catch (e) {
    return e;
  }
};

export const addTagToBookmark = async ({
  selectedData,
  session,
}: AddTagToBookmarkApiPayload) => {
  try {
    const res = await axios.post<{
      data: SingleListData;
    }>(`${NEXT_API_URL}${ADD_TAG_TO_BOOKMARK_API}`, {
      data: selectedData,
      access_token: session?.access_token,
    });
    return res?.data;
  } catch (e) {
    return e;
  }
};

export const removeTagFromBookmark = async ({
  selectedData,
  session,
}: {
  selectedData: { tag_id: number; bookmark_id: number };
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post<{
      data: UserTagsData;
      error: Error;
    }>(`${NEXT_API_URL}${REMOVE_TAG_FROM_BOOKMARK_API}`, {
      tag_id: selectedData?.tag_id,
      bookmark_id: selectedData?.bookmark_id,
      access_token: session?.access_token,
    });
    return res?.data;
  } catch (e) {
    return e;
  }
};

export const fetchBookmarksViews = async ({
  category_id,
  session,
}: {
  category_id: string | number | null;
  session: SupabaseSessionType;
}): Promise<{
  data: BookmarkViewDataTypes | null;
  error: Error;
}> => {
  if (!isUserInACategory(category_id as string)) {
    return {
      data: null,
      error: { message: "user not in category", name: "user not in category" },
    };
  }
  if (!session?.access_token && isNull(category_id)) {
    return {
      data: null,
      error: {
        message: "no access token and category id is null",
        name: "no access token and category id is nul",
      },
    };
  }
  try {
    const res = await axios.post<{
      data: BookmarkViewDataTypes | null;
      error: Error;
    }>(`${NEXT_API_URL}${FETCH_BOOKMARKS_VIEW}`, {
      category_id: isNull(category_id) ? 0 : category_id,
      access_token: session?.access_token,
    });
    return res?.data;
  } catch (e) {
    const error = e as Error;
    return {
      data: null,
      error,
    };
  }
};

// user catagories

export const fetchCategoriesData = async (
  userId: string,
  userEmail: string,
  session: SupabaseSessionType,
): Promise<{
  data: CategoriesData[] | null;
  error: Error;
}> => {
  if (!session?.access_token) {
    return {
      data: null,
      error: { name: "no access token", message: "no access token" },
    };
  }

  if (!isEmpty(userId)) {
    try {
      const res = await axios.post<{
        data: CategoriesData[] | null;
        error: Error;
      }>(`${NEXT_API_URL}${FETCH_USER_CATEGORIES_API}`, {
        userEmail,
        user_id: userId,
        access_token: session?.access_token,
      });

      return res.data;
    } catch (e) {
      const error = e as Error;
      return {
        data: null,
        error,
      };
    }
  } else {
    return {
      data: null,
      error: { name: "no user id", message: "no user id" },
    };
  }
};

export const addUserCategory = async ({
  user_id,
  name,
  category_order,
  session,
}: {
  user_id: string;
  name: string;
  category_order: number[];
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post<{
      data: CategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${CREATE_USER_CATEGORIES_API}`, {
      name,
      user_id,
      access_token: session?.access_token,
      category_order,
    });
    return res?.data;
  } catch (e) {
    return e;
  }
};

export const deleteUserCategory = async ({
  category_id,
  category_order,
  session,
}: DeleteUserCategoryApiPayload) => {
  try {
    const res = await axios.post<{
      data: CategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${DELETE_USER_CATEGORIES_API}`, {
      category_id,
      category_order,
      access_token: session?.access_token,
    });
    return res?.data;
  } catch (e) {
    return e;
  }
};

export const addCategoryToBookmark = async ({
  category_id,
  bookmark_id,
  update_access = false,
  session,
}: AddCategoryToBookmarkApiPayload) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${ADD_CATEGORY_TO_BOOKMARK_API}`,
      {
        category_id: isNull(category_id) || !category_id ? 0 : category_id,
        bookmark_id,
        update_access,
        access_token: session?.access_token,
      },
    );

    return res;
  } catch (e) {
    return e;
  }
};

export const updateCategory = async ({
  category_id,
  updateData,
  session,
}: UpdateCategoryApiPayload) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${UPDATE_USER_CATEGORIES_API}`,
      {
        category_id,
        updateData,
        access_token: session?.access_token,
      },
    );

    return res;
  } catch (e) {
    return e;
  }
};

export const updateCategoryOrder = async ({
  order,
  session,
}: UpdateCategoryOrderApiPayload) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${UPDATE_CATEGORY_ORDER_API}`,
      {
        category_order: order,
        access_token: session?.access_token,
      },
    );

    return res;
  } catch (e) {
    return e;
  }
};

// share
export const sendCollaborationEmailInvite = async ({
  emailList,
  category_id,
  edit_access,
  hostUrl,
  userId,
  session,
}: {
  emailList: Array<string>;
  category_id: number;
  edit_access: boolean;
  hostUrl: string;
  userId: string;
  session: SupabaseSessionType;
}) => {
  const res = await axios.post(
    `${NEXT_API_URL}${SEND_COLLABORATION_EMAIL_API}`,
    {
      emailList,
      category_id,
      edit_access,
      hostUrl,
      userId,
      access_token: session?.access_token,
    },
  );

  return res;
};

export const fetchSharedCategoriesData = async (
  session: SupabaseSessionType,
): Promise<{
  data: FetchSharedCategoriesData[] | null;
  error: Error;
}> => {
  if (!session?.access_token) {
    return {
      data: null,
      error: { message: "no access token", name: "no access token" },
    };
  }
  try {
    const res = await axios.get<{
      data: FetchSharedCategoriesData[] | null;
      error: Error;
    }>(
      `${NEXT_API_URL}${FETCH_SHARED_CATEGORIES_DATA_API}?access_token=${session?.access_token}`,
    );

    return res?.data;
  } catch (e) {
    const catchError = e as Error;
    return {
      data: null,
      error: catchError,
    };
  }
};

export const deleteSharedCategoriesUser = async ({
  id,
  session,
}: {
  id: number;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post<{
      data: FetchSharedCategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${DELETE_SHARED_CATEGORIES_USER_API}`, {
      id,
      access_token: session?.access_token,
    });

    return res?.data;
  } catch (e) {
    return e;
  }
};

export const updateSharedCategoriesUserAccess = async ({
  id,
  updateData,
  session,
}: UpdateSharedCategoriesUserAccessApiPayload) => {
  try {
    const res = await axios.post<{
      data: FetchSharedCategoriesData[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${UPDATE_SHARED_CATEGORY_USER_ROLE_API}`, {
      id,
      updateData,
      access_token: session?.access_token,
    });

    return res?.data;
  } catch (e) {
    return e;
  }
};

// profiles
export const fetchUserProfiles = async ({
  userId,
  session,
}: {
  userId: string;
  session: SupabaseSessionType;
}): Promise<{
  data: ProfilesTableTypes[] | null;
  error: Error;
}> => {
  if (!session?.access_token) {
    return {
      data: null,
      error: { name: "No access Token", message: "No Access token" },
    };
  }

  try {
    if (userId) {
      const res = await axios.get<{
        data: ProfilesTableTypes[] | null;
        error: Error;
      }>(
        `${NEXT_API_URL}${FETCH_USER_PROFILE_API}?access_token=${session?.access_token}&user_id=${userId}`,
      );
      return res?.data;
    }
    return {
      data: null,
      error: { name: "No user id", message: "No user id" },
    };
  } catch (e) {
    const error = e as Error;
    return {
      data: null,
      error,
    };
  }
};

export const updateUserProfile = async ({
  id,
  updateData,
  session,
}: UpdateUserProfileApiPayload) => {
  try {
    const res = await axios.post<{
      data: ProfilesTableTypes[] | null;
      error: Error;
    }>(`${NEXT_API_URL}${UPDATE_USER_PROFILE_API}`, {
      id,
      updateData,
      access_token: session?.access_token,
    });

    return res?.data;
  } catch (e) {
    return e;
  }
};

// auth

export const signInWithOauth = async (
  provider: Provider,
  supabase: SupabaseClient<any, "public", any>,
) => {
  await supabase.auth.signInWithOAuth({ provider });
};

export const signInWithEmailPassword = async (
  email: string,
  password: string,
  supabase: SupabaseClient<any, "public", any>,
) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error };
};

export const signUpWithEmailPassword = async (
  email: string,
  password: string,
  supabase: SupabaseClient<any, "public", any>,
) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  return { error };
};

export const signOut = async (supabase: SupabaseClient<any, "public", any>) => {
  await supabase.auth.signOut();
};
