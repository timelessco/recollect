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
  CollabDataInCategory,
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
  ADD_CATEGORY_TO_BOOKMARK_API,
  SYNC_PROFILES_TABLE_API,
  ADD_BOOKMARK_MIN_DATA,
  ADD_URL_SCREENSHOT_API,
} from './constants';
import slugify from 'slugify';
import isEmpty from 'lodash/isEmpty';
import { find } from 'lodash';

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

export const addBookmarkMinData = async ({
  url,
  category_id,
  update_access,
}: {
  url: string;
  category_id: number | null;
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
  try {
    const res = await axios.post(`${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`, {
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

export const fetchCategoriesData = async (
  userId: string,
  userEmail: string
) => {
  if (!isEmpty(userId)) {
    // filter onces where is_public true and userId is not same as uuid
    const { data, error } = await supabase.from(CATEGORIES_TABLE_NAME).select(`
      *,
      user_id (*)
    `);
    // .not('is_public', 'eq', true)
    // .not('user_id', 'neq', userId);
    // .or(`is_public.eq.true,and(user_id.eq.${userId})`);
    // .eq('is_public', false);
    // .eq('user_id', userId); // TODO: remove , we are not adding this filter as policy is updated

    // get shared-cat data

    const { data: sharedCategoryData } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .select();
    // .eq('email', userEmail);

    // add colaborators data in each category
    const finalDataWithCollab = data?.map((item) => {
      let collabData = [] as CollabDataInCategory[];
      sharedCategoryData?.forEach((catItem) => {
        if (catItem?.category_id === item?.id) {
          collabData = [
            ...collabData,
            {
              userEmail: catItem?.email,
              edit_access: catItem?.edit_access,
              share_id: catItem?.id,
              isOwner: false,
            },
          ];
        }
      });

      const collabDataWithOwnerData = [
        ...collabData,
        {
          userEmail: item?.user_id?.email,
          edit_access: true,
          share_id: null,
          isOwner: true,
        },
      ];

      return {
        ...item,
        collabData: collabDataWithOwnerData,
      };
    });

    // TODO : figure out how to do this in supabase , and change this to next api
    const finalPublicFilteredData = finalDataWithCollab?.filter((item) => {
      const userCollabData = find(
        item?.collabData,
        (collabItem) => collabItem?.userEmail === userEmail
      );
      // if logged-in user is a collaborator for this category, then return the category
      if (!isEmpty(userCollabData) && userCollabData?.isOwner === false) {
        return item;
      } else {
        // only return public categories that is created by logged in user
        if (!(item?.is_public === true && item?.user_id?.id !== userId)) {
          return item;
        }
      }
    });

    return {
      data: finalPublicFilteredData,
      error,
    } as unknown as FetchCategoriesDataResponse;
  }
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
      category_slug: slugify(name, { lower: true }),
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
  update_access = false,
}: {
  category_id: number | null | string;
  bookmark_id: number;
  update_access: boolean;
}) => {
  const session = await getCurrentUserSession();
  try {
    const res = await axios.post(
      `${NEXT_API_URL}${ADD_CATEGORY_TO_BOOKMARK_API}`,
      {
        access_token: session?.access_token,
        category_id,
        bookmark_id,
        update_access,
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
  const res = await axios.post(
    `${NEXT_API_URL}${SEND_COLLABORATION_EMAIL_API}`,
    {
      emailList,
      category_id,
      edit_access,
      hostUrl,
      userId,
    }
  );

  return res;
};

export const fetchSharedCategoriesData = async () => {
  const { data, error } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select();
  // .eq('email', email); // TODO: check and remove
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

export const updateSharedCategoriesUserAccess = async ({
  id,
  updateData,
}: {
  id: number;
  updateData: { edit_access: boolean };
}) => {
  const { data, error } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .update(updateData)
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

export const updateProfilesTable = async () => {
  try {
    const res = await axios.get(`${NEXT_API_URL}${SYNC_PROFILES_TABLE_API}`);

    return { data: res, error: undefined };
  } catch (e) {
    return { data: undefined, error: e };
  }
};
