import { Provider, Session, UserIdentity } from '@supabase/supabase-js';
import axios from 'axios';
import {
  FetchDataResponse,
  SingleListData,
  UrlData,
  FetchUserTagsDataResponse,
  FetchBookmarksTagDataResponse,
  BookmarksTagData,
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
} from './constants';

// bookmark
export const fetchData = async (tableName = MAIN_TABLE_NAME) => {
  const { data, error } = await supabase.from(tableName).select();
  return { data, error } as unknown as FetchDataResponse;
};

// gets bookmarks data
export const fetchBookmakrsData = async () => {
  const session = await getCurrentUserSession();

  try {
    const bookmarksData = await axios.get(
      `${NEXT_API_URL}${GET_BOOKMARKS_DATA_API}?access_token=${session?.access_token}`
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

export const addData = async (userData: UserIdentity, urlData?: UrlData) => {
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

export const addUserTags = async (
  userData: UserIdentity,
  tagsData?: { name: string }
) => {
  const { data, error } = await supabase.from(TAG_TABLE_NAME).insert([
    {
      name: tagsData?.name,
      user_id: userData?.id,
    },
  ]);

  return { data, error } as unknown as FetchUserTagsDataResponse;
};

export const addTagToBookmark = async (
  selectedData: Array<BookmarksTagData>
) => {
  const { data, error } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .insert(selectedData);

  return { data, error } as unknown as FetchBookmarksTagDataResponse;
};

export const removeTagFromBookmark = async (selectedData: BookmarksTagData) => {
  const { data, error } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .delete()
    .match({ id: selectedData?.bookmark_tag_id });

  return { data, error } as unknown as FetchBookmarksTagDataResponse;
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
