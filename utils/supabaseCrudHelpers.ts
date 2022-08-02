import { Provider, Session, UserIdentity } from '@supabase/supabase-js';
import {
  FetchDataResponse,
  SingleListData,
  UrlData,
  FetchUserTagsDataResponse,
} from '../types/apiTypes';
import { supabase } from '../utils/supabaseClient';
import { MAIN_TABLE_NAME, TAG_TABLE_NAME } from './constants';

// bookmark
export const fetchData = async (tableName = MAIN_TABLE_NAME) => {
  const { data, error } = await supabase.from(tableName).select();
  return { data, error } as unknown as FetchDataResponse;
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
  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .delete()
    .match({ id: item?.id });

  return { data, error };
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
