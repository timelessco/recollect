import type { NextApiRequest, NextApiResponse } from 'next';
// import { supabase } from '../../utils/supabaseClient';
import {
  SingleListData,
  BookmarksCountTypes,
  BookmarksWithTagsWithTagForginKeys,
} from '../../../types/apiTypes';
import {
  BOOKMARK_TAGS_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  PAGINATION_LIMIT,
  PROFILES,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from '../../../utils/constants';
import isNull from 'lodash/isNull';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { BookmarksSortByTypes } from '../../../types/componentStoreTypes';
import { isEmpty } from 'lodash';
// gets all bookmarks data mapped with the data related to other tables , like tags , catrgories etc...

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
  count: BookmarksCountTypes | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const category_id = req.query.category_id;
  const from = parseInt(req.query.from as string);
  const accessToken = req.query.access_token as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  let decode;

  await jwt.verify(
    accessToken,
    process.env.SUPABASE_JWT_SECRET_KEY as string,
    function (err, decoded) {
      if (err) {
        res.status(500).json({ data: null, error: err, count: null });
        throw new Error('ERROR');
      } else {
        decode = decoded;
      }
    }
  );

  // const decode = jwt_decode(accessToken) as unknown;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const userId = decode?.sub;

  const categoryCondition =
    category_id !== null &&
    category_id !== 'null' &&
    category_id !== TRASH_URL &&
    category_id !== UNCATEGORIZED_URL;

  let data;
  let sortVaue;

  if (categoryCondition) {
    const { data: userCategorySortData } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .select(`category_views`)
      .eq('user_id', userId)
      .eq('id', category_id);

    sortVaue =
      !isEmpty(userCategorySortData) &&
      !isNull(userCategorySortData) &&
      (userCategorySortData[0]?.category_views?.sortBy as BookmarksSortByTypes);
  } else {
    const { data: userSortData } = await supabase
      .from(PROFILES)
      .select(`bookmarks_view`)
      .eq('id', userId);

    sortVaue =
      !isNull(userSortData) &&
      !isEmpty(userSortData) &&
      (userSortData[0]?.bookmarks_view?.sortBy as BookmarksSortByTypes);
  }

  // get all bookmarks
  let query = supabase
    .from(MAIN_TABLE_NAME)
    .select(
      `
*,
user_id,
user_id (
  *
)
`
    )
    // .eq('user_id', userId) // this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove
    .eq('trash', category_id === TRASH_URL)
    .range(from === 0 ? from : from + 1, from + PAGINATION_LIMIT);

  if (categoryCondition) {
    query = query.eq('category_id', category_id);
  } else {
    query = query.eq('user_id', userId);
  }

  if (category_id === UNCATEGORIZED_URL) {
    query = query.eq('category_id', 0);
  }

  if (sortVaue === 'date-sort-acending') {
    query = query.order('id', { ascending: false });
  }
  if (sortVaue === 'date-sort-decending') {
    query = query.order('id', { ascending: true });
  }
  if (sortVaue === 'alphabetical-sort-acending') {
    query = query.order('title', { ascending: true });
  }
  if (sortVaue === 'alphabetical-sort-decending') {
    query = query.order('title', { ascending: false });
  }
  if (sortVaue === 'url-sort-acending') {
    query = query.order('url', { ascending: true });
  }
  if (sortVaue === 'url-sort-decending') {
    query = query.order('url', { ascending: false });
  }

  const { data: bookmarkData, error } = await query;

  // eslint-disable-next-line prefer-const
  data = bookmarkData;

  const { data: bookmarksWithTags } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .select(
      `
    bookmark_id,
    tag_id (
      id,
      name
    )`
    )
    .eq('user_id', userId);

  const finalData = data?.map((item) => {
    const matchedBookmarkWithTag = bookmarksWithTags?.filter(
      (tagItem) => tagItem?.bookmark_id === item?.id
    ) as BookmarksWithTagsWithTagForginKeys;

    if (!isEmpty(matchedBookmarkWithTag)) {
      return {
        addedTags: matchedBookmarkWithTag?.map((matchedItem) => {
          return {
            id: matchedItem?.tag_id?.id,
            name: matchedItem?.tag_id?.name,
          };
        }),
        ...item,
      };
    } else {
      return item;
    }
  }) as SingleListData[];

  res.status(200).json({ data: finalData, error, count: null });
  return;
}