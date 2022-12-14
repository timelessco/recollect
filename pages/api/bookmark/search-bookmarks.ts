import type { NextApiRequest, NextApiResponse } from 'next';
import {
  BookmarksWithTagsWithTagForginKeys,
  SingleListData,
} from '../../../types/apiTypes';
import {
  BOOKMARK_TAGS_TABLE_NAME,
  GET_TEXT_WITH_AT_CHAR,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from '../../../utils/constants';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import jwtDecode from 'jwt-decode';

// searches bookmarks

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await jwt.verify(
    req.query.access_token as string,
    process.env.SUPABASE_JWT_SECRET_KEY as string,
    function (err) {
      if (err) {
        res.status(500).json({ data: null, error: err });
        return;
      }
    }
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const category_id = req.query.category_id;
  const search = req.query.search as string;

  const searchText = search?.replace(GET_TEXT_WITH_AT_CHAR, '');

  const matchedSearchTag = search?.match(GET_TEXT_WITH_AT_CHAR);

  const tagName =
    !isEmpty(matchedSearchTag) && !isNull(matchedSearchTag)
      ? matchedSearchTag?.map((item) => item?.replace('@', ''))
      : undefined;

  const tokenDecode = jwtDecode(req.query.access_token as string);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const user_id = tokenDecode?.sub;

  let query = supabase
    .rpc('search_bookmarks', {
      search_text: searchText,
    })
    .eq('trash', category_id === TRASH_URL ? true : false)

    .eq('user_id', req.query.user_id);

  if (!isNull(category_id) && category_id !== 'null') {
    if (category_id !== TRASH_URL) {
      query = query.eq(
        'category_id',
        category_id === UNCATEGORIZED_URL ? 0 : category_id
      );
    }
  }

  const { data, error } = await query;

  if (!tagName) {
    // user has searched for text without tags

    const { data: bookmarksWithTags } = await supabase
      .from(BOOKMARK_TAGS_TABLE_NAME)
      .select(
        `
        bookmark_id,
        tag_id (
          id,
          name
        )
      `
      )
      .eq('user_id', user_id);

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

    res.status(200).json({ data: finalData, error });
  } else {
    const { data: bookmarksWithTags } = await supabase
      .from(BOOKMARK_TAGS_TABLE_NAME)
      .select(
        `
      bookmark_id (*),
      tag_id!inner(
        id,
        name
      )
    `
      )
      .eq('user_id', user_id)
      .in('tag_id.name', tagName);

    if (isEmpty(data)) {
      // user as only searched for tags and no text

      res.status(200).json({
        data: bookmarksWithTags?.map((item) => {
          return {
            addedTags: [item?.tag_id],
            ...item?.bookmark_id,
          };
        }) as SingleListData[],
        error,
      });
    } else {
      // user searched for tag with text
      const finalData = data?.filter((item) => {
        const bookmarkTagId = find(
          bookmarksWithTags,
          (tagBookmark) => tagBookmark?.bookmark_id?.id === item?.id
        );

        if (bookmarkTagId) {
          return item;
        }
      });

      res.status(200).json({
        data: finalData?.map((item) => {
          const bookmarkTagId = find(
            bookmarksWithTags,
            (tagBookmark) => tagBookmark?.bookmark_id?.id === item?.id
          );
          if (bookmarkTagId) {
            return {
              addedTags: [bookmarkTagId?.tag_id],
              ...item,
            };
          }
        }) as SingleListData[],
        error,
      });
    }
  }
}
