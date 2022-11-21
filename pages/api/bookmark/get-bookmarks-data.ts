import type { NextApiRequest, NextApiResponse } from 'next';
// import { supabase } from '../../utils/supabaseClient';
import { UserTagsData, SingleListData } from '../../../types/apiTypes';
import {
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
  PAGINATION_LIMIT,
  PROFILES,
  TAG_TABLE_NAME,
  TRASH_URL,
} from '../../../utils/constants';
import { getTagAsPerId } from '../../../utils/helpers';
import isNull from 'lodash/isNull';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { BookmarksSortByTypes } from '../../../types/componentStoreTypes';
// gets all bookmarks data mapped with the data related to other tables , like tags , catrgories etc...

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
  count: number | null;
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
        return;
      } else {
        decode = decoded;
      }
    }
  );

  // const decode = jwt_decode(accessToken) as unknown;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const userId = decode?.sub;

  let data;
  let count;

  if (category_id === 'null') {
    const { data: userSortData } = await supabase
      .from(PROFILES)
      .select(`bookmarks_view`)
      .eq('id', userId);

    const sortVaue = userSortData[0]?.bookmarks_view
      ?.sortBy as BookmarksSortByTypes;

    console.log('ddd', sortVaue);

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
      .eq('trash', false)
      .eq('user_id', userId) // this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove
      .range(from === 0 ? from : from + 1, from + PAGINATION_LIMIT);

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

    const { data: bookmarkData } = await query;

    const { data: bookmarkCountData } = await supabase
      .from(MAIN_TABLE_NAME)
      .select(
        `
      title
    `
      )
      .eq('trash', false)
      .eq('user_id', userId); // this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove

    data = bookmarkData;
    count = bookmarkCountData?.length;
  } else if (category_id === TRASH_URL) {
    // get trash bookmarks
    const { data: bookmarkData } = await supabase
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
      .eq('trash', true)
      .eq('user_id', userId); // TODO: check and remove

    data = bookmarkData;
  } else {
    // get bookmarks in a category
    const { data: bookmarkData } = await supabase
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
      .eq('trash', false)
      .eq('category_id', category_id);
    // .eq('user_id', userId);  // TODO: check and remove

    data = bookmarkData;
  }

  const { data: bookmarkTags } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .select();
  const { data: tagsData, error } = await supabase
    .from(TAG_TABLE_NAME)
    .select();

  if (!isNull(tagsData)) {
    const finalData = data?.map((item) => {
      let addedTags = [] as Array<UserTagsData>;

      bookmarkTags?.forEach((bookmarkTagsItem) => {
        if (bookmarkTagsItem?.bookmark_id === item?.id) {
          addedTags = [
            ...addedTags,
            {
              ...getTagAsPerId(bookmarkTagsItem?.tag_id, tagsData),
              bookmark_tag_id: bookmarkTagsItem?.id,
            },
          ];
        }
      });

      return {
        ...item,
        addedTags,
      };
    }) as Array<SingleListData>;

    res.status(200).json({ data: finalData, error, count: count || null });
    return;
  } else {
    res.status(500).json({ data, error, count: null });
    return;
  }
}
