import { Provider, Session, UserIdentity } from '@supabase/supabase-js';
import axios from 'axios';
import {
  FetchDataResponse,
  SingleListData,
  UrlData,
  BookmarksTagData,
  BookmarkViewDataTypes,
  ProfilesTableTypes,
} from '../types/apiTypes';
import { supabase } from '../utils/supabaseClient';
import {
  BOOKMARK_SCRAPPER_API,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  GET_BOOKMARKS_DATA_API,
  DELETE_BOOKMARK_DATA_API,
  CATEGORIES_TABLE_NAME,
  SEND_COLLABORATION_EMAIL_API,
  ADD_CATEGORY_TO_BOOKMARK_API,
  SYNC_PROFILES_TABLE_API,
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
} from './constants';
import isEmpty from 'lodash/isEmpty';
import { isNull } from 'lodash';

// bookmark
export const fetchData = async <T>(tableName = CATEGORIES_TABLE_NAME) => {
  const { data, error } = await supabase.from(tableName).select();
  return { data, error } as unknown as FetchDataResponse<T>;
};

// gets bookmarks data
export const fetchBookmakrsData = async (
  category_id: string | null | number
) => {
  const session = await getCurrentUserSession();

  if (!session?.access_token) {
    return;
  }

  try {
    const bookmarksData = await axios.get(
      `${NEXT_API_URL}${GET_BOOKMARKS_DATA_API}?access_token=${session?.access_token}&category_id=${category_id}`
    );
    return {
      data: bookmarksData?.data?.data,
      error: null,
    } as unknown as FetchDataResponse;
  } catch (e) {
    return { data: undefined, error: e } as unknown as FetchDataResponse;
  }
};

// gets scrapped data with screenshot uploaded in supabse bucket

// TODO: check and remove
export const getBookmarkScrappedData = async (item: string) => {
  const session = await getCurrentUserSession();

  try {
    const apiRes = await axios.post(`${NEXT_API_URL}${BOOKMARK_SCRAPPER_API}`, {
      access_token: session?.access_token,
      url: item,
    });

    return apiRes;
  } catch (e) {
    return e;
  }
};

export const addBookmarkMinData = async ({
  url,
  category_id,
  update_access,
}: {
  url: string;
  category_id: number | null | string;
  update_access: boolean;
}) => {
  const session = await getCurrentUserSession();

  try {
    const apiRes = await axios.post(`${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA}`, {
      access_token: session?.access_token,
      url,
      category_id,
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
}: {
  url: string;
  id: number;
}) => {
  const session = await getCurrentUserSession();

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

// TODO: check and remove
export const addData = async ({
  userData,
  urlData,
}: {
  userData: UserIdentity;
  urlData?: UrlData;
}) => {
  const { data, error } = await supabase.from(MAIN_TABLE_NAME).insert([
    {
      title: urlData?.title,
      url: urlData?.url,
      description: urlData?.description,
      ogImage: urlData?.ogImage,
      user_id: userData?.id,
      screenshot: urlData?.screenshot,
    },
  ]);

  return { data, error } as unknown as FetchDataResponse;
};

export const deleteData = async (item: SingleListData | { id: number }) => {
  try {
    const session = await getCurrentUserSession();
    const res = await axios.post(`${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`, {
      data: item,
      access_token: session?.access_token,
    });

    return res;
  } catch (e) {
    return e;
  }
};

export const moveBookmarkToTrash = async ({
  data,
  isTrash,
}: {
  data: SingleListData;
  isTrash: boolean;
}) => {
  try {
    const session = await getCurrentUserSession();
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
}: {
  user_id: string | undefined;
}) => {
  try {
    const session = await getCurrentUserSession();
    const res = await axios.post(`${NEXT_API_URL}${CLEAR_BOOKMARK_TRASH_API}`, {
      user_id,
      access_token: session?.access_token,
    });

    return res;
  } catch (e) {
    return e;
  }
};

// user tags
export const fetchUserTags = async (user_id: string) => {
  if (user_id && !isEmpty(user_id)) {
    try {
      const session = await getCurrentUserSession();
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
}: {
  userData: UserIdentity;
  tagsData: { name: string };
}) => {
  try {
    const session = await getCurrentUserSession();
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
}: {
  selectedData: Array<BookmarksTagData> | BookmarksTagData;
}) => {
  try {
    const session = await getCurrentUserSession();
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
}: {
  selectedData: BookmarksTagData;
}) => {
  try {
    const session = await getCurrentUserSession();
    const res = await axios.post(
      `${NEXT_API_URL}${REMOVE_TAG_FROM_BOOKMARK_API}`,
      {
        bookmark_tag_id: selectedData?.bookmark_tag_id,
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
}: {
  category_id: string | number | null;
}) => {
  try {
    const session = await getCurrentUserSession();
    if (!session?.access_token && isNull(category_id)) {
      return;
    }
    const res = await axios.post(`${NEXT_API_URL}${FETCH_BOOKMARKS_VIEW}`, {
      category_id: category_id,
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
  userEmail: string
) => {
  if (!isEmpty(userId)) {
    try {
      const session = await getCurrentUserSession();
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
}: {
  user_id: string;
  name: string;
}) => {
  try {
    const session = await getCurrentUserSession();
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
}: {
  category_id: number;
}) => {
  try {
    const session = await getCurrentUserSession();
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
}: {
  category_id: number | null | string;
  bookmark_id: number;
  update_access: boolean;
}) => {
  try {
    const session = await getCurrentUserSession();
    const res = await axios.post(
      `${NEXT_API_URL}${ADD_CATEGORY_TO_BOOKMARK_API}`,
      {
        category_id,
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
}: {
  category_id: number | null | string;
  updateData: {
    is_public?: boolean;
    icon?: null | string;
    category_views?: BookmarkViewDataTypes;
  };
}) => {
  try {
    const session = await getCurrentUserSession();
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
}: {
  emailList: Array<string>;
  category_id: number;
  edit_access: boolean;
  hostUrl: string;
  userId: string;
}) => {
  const session = await getCurrentUserSession();
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

export const fetchSharedCategoriesData = async () => {
  try {
    const session = await getCurrentUserSession();
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

export const deleteSharedCategoriesUser = async ({ id }: { id: number }) => {
  try {
    const session = await getCurrentUserSession();
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
}: {
  id: number;
  updateData: { edit_access?: boolean; category_views?: BookmarkViewDataTypes };
}) => {
  try {
    const session = await getCurrentUserSession();
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
export const fetchUserProfiles = async ({ userId }: { userId: string }) => {
  try {
    const session = await getCurrentUserSession();
    if (userId) {
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
}: {
  id: string;
  updateData: ProfilesTableTypes;
}) => {
  try {
    const session = await getCurrentUserSession();
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

export const getCurrentUserSession = async () => {
  const currentSession = await supabase.auth.session();
  return currentSession as Session;
};

export const signInWithOauth = async (provider: Provider = 'google') => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, session, error } = await supabase.auth.signIn({
    provider,
  });
};

export const signInWithEmailPassword = async (
  email: string,
  password: string
) => {
  const { user, session, error } = await supabase.auth.signIn({
    email: email,
    password: password,
  });

  return { user, session, error };
};

export const signUpWithEmailPassword = async (
  email: string,
  password: string
) => {
  const { user, session, error } = await supabase.auth.signUp({
    email,
    password,
  });

  return { user, session, error };
};

export const signOut = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { error } = await supabase.auth.signOut();
};

export const updateProfilesTable = async () => {
  try {
    const session = await getCurrentUserSession();

    if (!session?.access_token) {
      return;
    }
    const res = await axios.get(
      `${NEXT_API_URL}${SYNC_PROFILES_TABLE_API}?access_token=${session?.access_token}`
    );

    return { data: res, error: undefined };
  } catch (e) {
    return { data: undefined, error: e };
  }
};
