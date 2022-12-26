import { Provider, SupabaseClient, UserIdentity } from '@supabase/supabase-js';
import axios from 'axios';
import {
  FetchDataResponse,
  SingleListData,
  BookmarksTagData,
  BookmarkViewDataTypes,
  ProfilesTableTypes,
  SupabaseSessionType,
} from '../types/apiTypes';
import {
  NEXT_API_URL,
  GET_BOOKMARKS_DATA_API,
  DELETE_BOOKMARK_DATA_API,
  SEND_COLLABORATION_EMAIL_API,
  ADD_CATEGORY_TO_BOOKMARK_API,
  ADD_BOOKMARK_MIN_DATA,
  ADD_URL_SCREENSHOT_API,
  FETCH_USER_TAGS_API,
  CREATE_USER_TAGS_API,
  ADD_TAG_TO_BOOKMARK_API,
  REMOVE_TAG_FROM_BOOKMARK_API,
  FETCH_USER_CATEGORIES_API,
  CREATE_USER_CATEGORIES_API,
  DELETE_USER_CATEGORIES_API,
  UPDATE_USER_CATEGORIES_API,
  FETCH_SHARED_CATEGORIES_DATA_API,
  UPDATE_SHARED_CATEGORY_USER_ROLE_API,
  DELETE_SHARED_CATEGORIES_USER_API,
  MOVE_BOOKMARK_TO_TRASH_API,
  CLEAR_BOOKMARK_TRASH_API,
  FETCH_BOOKMARKS_VIEW,
  FETCH_USER_PROFILE_API,
  UPDATE_USER_PROFILE_API,
  SEARCH_BOOKMARKS,
  GET_BOOKMARKS_COUNT,
} from '../utils/constants';
import isEmpty from 'lodash/isEmpty';
import { CategoryIdUrlTypes } from '../types/componentTypes';
import isNull from 'lodash/isNull';

// bookmark
// gets bookmarks data
export const fetchBookmakrsData = async (
  // category_id: string | null | number,
  // from: number
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  { pageParam = 0, queryKey },
  session: SupabaseSessionType
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
    return;
  }

  try {
    const bookmarksData = await axios.get(
      `${NEXT_API_URL}${GET_BOOKMARKS_DATA_API}?access_token=${session?.access_token}&category_id=${categoryId}&from=${pageParam}`
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
  queryData: { queryKey: string[] },
  session: SupabaseSessionType
) => {
  const userId =
    !isEmpty(queryData?.queryKey) && queryData?.queryKey?.length < 4
      ? queryData?.queryKey[1]
      : undefined;

  if (userId) {
    try {
      if (!session?.access_token) return;
      const bookmarksData = await axios.get(
        `${NEXT_API_URL}${GET_BOOKMARKS_COUNT}?access_token=${session?.access_token}`
      );

      return bookmarksData?.data;
    } catch (e) {
      return e;
    }
  }
};

export const addBookmarkMinData = async ({
  url,
  category_id,
  update_access,
  session,
}: {
  url: string;
  category_id: number | string | null;
  update_access: boolean;
  session: SupabaseSessionType;
}) => {
  try {
    const apiRes = await axios.post(`${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA}`, {
      access_token: session?.access_token,
      url,
      category_id: isNull(category_id) ? 0 : category_id,
      update_access,
    });

    return apiRes;
  } catch (e) {
    return e;
  }
};

export const addBookmarkScreenshot = async ({
  url,
  id,
  session,
}: {
  url: string;
  id: number;
  session: SupabaseSessionType;
}) => {
  try {
    const apiRes = await axios.post(
      `${NEXT_API_URL}${ADD_URL_SCREENSHOT_API}`,
      {
        access_token: session?.access_token,
        url,
        id,
      }
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
}: {
  data: SingleListData;
  isTrash: boolean;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${MOVE_BOOKMARK_TO_TRASH_API}`,
      {
        data: data,
        isTrash: isTrash,
        access_token: session?.access_token,
      }
    );

    return res;
  } catch (e) {
    return e;
  }
};

export const clearBookmarksInTrash = async ({
  user_id = undefined,
  session,
}: {
  user_id: string | undefined;
  session: SupabaseSessionType;
}) => {
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
  session: SupabaseSessionType
) => {
  if (!isEmpty(searchText) && searchText !== '#') {
    try {
      const res = await axios.get(
        `${NEXT_API_URL}${SEARCH_BOOKMARKS}?search=${searchText}&access_token=${session?.access_token}&user_id=${session?.user?.id}&category_id=${category_id}`
      );
      return res?.data;
    } catch (e) {
      return e;
    }
  }
};

// user tags
export const fetchUserTags = async (
  user_id: string,
  session: SupabaseSessionType
) => {
  if (user_id && !isEmpty(user_id)) {
    try {
      if (!session?.access_token) return;
      const res = await axios.get(
        `${NEXT_API_URL}${FETCH_USER_TAGS_API}?user_id=${user_id}&access_token=${session?.access_token}`
      );
      return res?.data;
    } catch (e) {
      return e;
    }
  }
};

export const addUserTags = async ({
  userData,
  tagsData,
  session,
}: {
  userData: UserIdentity;
  tagsData: { name: string };
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(`${NEXT_API_URL}${CREATE_USER_TAGS_API}`, {
      name: tagsData?.name,
      user_id: userData?.id,
      access_token: session?.access_token,
    });
    return res?.data;
  } catch (e) {
    return e;
  }
};

export const addTagToBookmark = async ({
  selectedData,
  session,
}: {
  selectedData: Array<BookmarksTagData> | BookmarksTagData;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(`${NEXT_API_URL}${ADD_TAG_TO_BOOKMARK_API}`, {
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
    const res = await axios.post(
      `${NEXT_API_URL}${REMOVE_TAG_FROM_BOOKMARK_API}`,
      {
        tag_id: selectedData?.tag_id,
        bookmark_id: selectedData?.bookmark_id,
        access_token: session?.access_token,
      }
    );
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
}) => {
  try {
    if (!session?.access_token && isNull(category_id)) {
      return;
    }
    const res = await axios.post(`${NEXT_API_URL}${FETCH_BOOKMARKS_VIEW}`, {
      category_id: isNull(category_id) ? 0 : category_id,
      access_token: session?.access_token,
    });
    return res?.data;
  } catch (e) {
    return e;
  }
};

// user catagories

export const fetchCategoriesData = async (
  userId: string,
  userEmail: string,
  session: SupabaseSessionType
) => {
  if (!isEmpty(userId)) {
    try {
      if (!session?.access_token) return;
      const res = await axios.post(
        `${NEXT_API_URL}${FETCH_USER_CATEGORIES_API}`,
        {
          userEmail: userEmail,
          user_id: userId,
          access_token: session?.access_token,
        }
      );
      return res?.data;
    } catch (e) {
      return e;
    }
  }
};

export const addUserCategory = async ({
  user_id,
  name,
  session,
}: {
  user_id: string;
  name: string;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${CREATE_USER_CATEGORIES_API}`,
      {
        name: name,
        user_id: user_id,
        access_token: session?.access_token,
      }
    );
    return res?.data;
  } catch (e) {
    return e;
  }
};

export const deleteUserCategory = async ({
  category_id,
  session,
}: {
  category_id: number;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${DELETE_USER_CATEGORIES_API}`,
      {
        category_id: category_id,
        access_token: session?.access_token,
      }
    );
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
}: {
  category_id: number | null;
  bookmark_id: number;
  update_access: boolean;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${ADD_CATEGORY_TO_BOOKMARK_API}`,
      {
        category_id: isNull(category_id) || !category_id ? 0 : category_id,
        bookmark_id,
        update_access,
        access_token: session?.access_token,
      }
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
}: {
  category_id: number | null | string;
  updateData: {
    is_public?: boolean;
    icon?: null | string;
    category_views?: BookmarkViewDataTypes;
  };
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${UPDATE_USER_CATEGORIES_API}`,
      {
        category_id,
        updateData,
        access_token: session?.access_token,
      }
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
    }
  );

  return res;
};

export const fetchSharedCategoriesData = async (
  session: SupabaseSessionType
) => {
  try {
    if (!session?.access_token) {
      return;
    }
    const res = await axios.get(
      `${NEXT_API_URL}${FETCH_SHARED_CATEGORIES_DATA_API}?access_token=${session?.access_token}`
    );

    return res?.data;
  } catch (e) {
    return e;
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
    const res = await axios.post(
      `${NEXT_API_URL}${DELETE_SHARED_CATEGORIES_USER_API}`,
      { id, access_token: session?.access_token }
    );

    return res?.data;
  } catch (e) {
    return e;
  }
};

export const updateSharedCategoriesUserAccess = async ({
  id,
  updateData,
  session,
}: {
  id: number;
  updateData: { edit_access?: boolean; category_views?: BookmarkViewDataTypes };
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${UPDATE_SHARED_CATEGORY_USER_ROLE_API}`,
      {
        id,
        updateData,
        access_token: session?.access_token,
      }
    );

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
}) => {
  try {
    if (userId) {
      if (!session?.access_token) return;
      const res = await axios.get(
        `${NEXT_API_URL}${FETCH_USER_PROFILE_API}?access_token=${session?.access_token}&user_id=${userId}`
      );
      return res?.data;
    }
  } catch (e) {
    return e;
  }
};

export const updateUserProfile = async ({
  id,
  updateData,
  session,
}: {
  id: string;
  updateData: ProfilesTableTypes;
  session: SupabaseSessionType;
}) => {
  try {
    const res = await axios.post(`${NEXT_API_URL}${UPDATE_USER_PROFILE_API}`, {
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
  provider: Provider = 'google',
  supabase: SupabaseClient<any, 'public', any>
) => {
  const {} = await supabase.auth.signInWithOAuth({ provider });
};

export const signInWithEmailPassword = async (
  email: string,
  password: string,
  supabase: SupabaseClient<any, 'public', any>
) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error };
};

export const signUpWithEmailPassword = async (
  email: string,
  password: string,
  supabase: SupabaseClient<any, 'public', any>
) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  return { error };
};

export const signOut = async (supabase: SupabaseClient<any, 'public', any>) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { error } = await supabase.auth.signOut();
};
