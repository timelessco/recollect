import { Provider, Session, UserIdentity } from '@supabase/supabase-js';
import axios from 'axios';
import {
  FetchDataResponse,
  SingleListData,
  UrlData,
  FetchUserTagsDataResponse,
  FetchBookmarksTagDataResponse,
  BookmarksTagData,
  FetchCategoriesDataResponse,
  FetchSharedCategoriesData,
} from '../types/apiTypes';
import { supabase } from '../utils/supabaseClient';
import {
  BOOKMARK_SCRAPPER_API,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  TAG_TABLE_NAME,
  GET_BOOKMARKS_DATA_API,
  BOOKMARK_TAGS_TABLE_NAME,
  DELETE_BOOKMARK_DATA_API,
  CATEGORIES_TABLE_NAME,
  SEND_COLLABORATION_EMAIL_API,
  SHARED_CATEGORIES_TABLE_NAME,
} from './constants';
import slugify from 'slugify';

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

export const deleteData = async (item: SingleListData) => {
  const session = await getCurrentUserSession();

  try {
    const res = await axios.post(`${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`, {
      access_token: session?.access_token,
      data: item,
    });

    return res;
  } catch (e) {
    return e;
  }
};

// user tags
export const fetchUserTags = async (tableName = TAG_TABLE_NAME) => {
  const { data, error } = await supabase.from(tableName).select();
  return { data, error } as unknown as FetchUserTagsDataResponse;
};

export const addUserTags = async ({
  userData,
  tagsData,
}: {
  userData: UserIdentity;
  tagsData: { name: string };
}) => {
  const { data, error } = await supabase.from(TAG_TABLE_NAME).insert([
    {
      name: tagsData?.name,
      user_id: userData?.id,
    },
  ]);

  return { data, error } as unknown as FetchUserTagsDataResponse;
};

export const addTagToBookmark = async ({
  selectedData,
}: {
  selectedData: Array<BookmarksTagData> | BookmarksTagData;
}) => {
  const { data, error } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .insert(selectedData);

  return { data, error } as unknown as FetchBookmarksTagDataResponse;
};

export const removeTagFromBookmark = async ({
  selectedData,
}: {
  selectedData: BookmarksTagData;
}) => {
  const { data, error } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .delete()
    .match({ id: selectedData?.bookmark_tag_id });

  return { data, error } as unknown as FetchBookmarksTagDataResponse;
};

// user catagories

export const fetchCategoriesData = async () => {
  const { data, error } = await supabase.from(CATEGORIES_TABLE_NAME).select();
  // .eq('user_id', userId); // TODO: remove , we are not adding this filter as policy is updated
  return { data, error } as unknown as FetchCategoriesDataResponse;
};

export const addUserCategory = async ({
  user_id,
  name,
}: {
  user_id: string;
  name: string;
}) => {
  const { data, error } = await supabase.from(CATEGORIES_TABLE_NAME).insert([
    {
      category_name: name,
      user_id: user_id,
      category_slug: slugify(name),
    },
  ]);

  return { data, error } as unknown as FetchCategoriesDataResponse;
};

export const deleteUserCategory = async ({
  category_id,
}: {
  category_id: string;
}) => {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .delete()
    .match({ id: category_id });

  return { data, error } as unknown as FetchCategoriesDataResponse;
};

export const addCategoryToBookmark = async ({
  category_id,
  bookmark_id,
}: {
  category_id: number | null | string;
  bookmark_id: number;
}) => {
  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({ category_id: category_id })
    .match({ id: bookmark_id });

  return { data, error } as unknown as FetchDataResponse;
};

export const updateCategory = async ({
  category_id,
  updateData,
}: {
  category_id: number | null | string;
  updateData: { is_public: boolean };
}) => {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .update(updateData)
    .match({ id: category_id });

  return { data, error } as unknown as FetchCategoriesDataResponse;
};

// share
export const sendCollaborationEmailInvite = async ({
  emailList,
  category_id,
  user_role,
  hostUrl,
}: {
  emailList: Array<string>;
  category_id: number;
  user_role: string;
  hostUrl: string;
}) => {
  const res = await axios.post(
    `${NEXT_API_URL}${SEND_COLLABORATION_EMAIL_API}`,
    {
      emailList,
      category_id,
      user_role,
      hostUrl,
    }
  );

  return res;
};

export const fetchSharedCategoriesData = async () => {
  const { data, error } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select();
  // .eq('email', email);
  return {
    data,
    error,
  } as unknown as FetchDataResponse<FetchSharedCategoriesData>;
};

export const deleteSharedCategoriesUser = async ({ id }: { id: number }) => {
  const { data, error } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .delete()
    .match({ id: id });
  return {
    data,
    error,
  } as unknown as FetchDataResponse<FetchSharedCategoriesData>;
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

export const signOut = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { error } = await supabase.auth.signOut();
};
