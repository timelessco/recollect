import type { NextApiRequest, NextApiResponse } from 'next';
// import { supabase } from '../../utils/supabaseClient';
import { BookmarksCountTypes } from '../../../src/types/apiTypes';
import {
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
} from '../../../src/utils/constants';
import isNull from 'lodash/isNull';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import isEmpty from 'lodash/isEmpty';

// get all bookmarks count

type Data = {
  data: BookmarksCountTypes | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
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
        res.status(500).json({ data: null, error: err });
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

  let count = {
    allBookmarks: 0,
    categoryCount: [],
    trash: 0,
    uncategorized: 0,
  } as BookmarksCountTypes;

  const { error: bookErr, count: bookmarkCount } = await supabase
    .from(MAIN_TABLE_NAME)
    .select(
      `
    id
  `,
      { count: 'exact', head: true }
    )
    .eq('user_id', userId)
    .eq('trash', false); // this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove

  count = {
    ...count,
    allBookmarks: bookmarkCount as number,
  };

  const { error: bookTrashErr, count: bookmarkTrashCount } = await supabase
    .from(MAIN_TABLE_NAME)
    .select(
      `
    id
  `,
      { count: 'exact', head: true }
    )
    .eq('user_id', userId)
    .eq('trash', true); // this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove

  count = {
    ...count,
    trash: bookmarkTrashCount as number,
  };

  const { error: bookUnCatErr, count: bookmarkUnCatCount } = await supabase
    .from(MAIN_TABLE_NAME)
    .select(
      `
    id
  `,
      { count: 'exact', head: true }
    )
    .eq('user_id', userId)
    .eq('trash', false)
    .eq('category_id', 0); // this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove

  count = {
    ...count,
    uncategorized: bookmarkUnCatCount as number,
  };

  // category count
  // get all user category ids
  const { data: userCategoryIds, error: categoryErr } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select(
      `
    id
  `
    )
    .eq('user_id', userId);

  const buildCategoryCount = new Promise<void>((resolve) => {
    if (isNull(userCategoryIds) || isEmpty(userCategoryIds)) {
      resolve();
    }
    userCategoryIds?.forEach(async (item) => {
      const { count: bookmarkCount } = await supabase
        .from(MAIN_TABLE_NAME)
        .select(
          `
          id
        `,
          { count: 'exact', head: true }
        )
        .eq('user_id', userId)
        .eq('category_id', item?.id)
        .eq('trash', false);

      count = {
        ...count,
        categoryCount: [
          ...count?.categoryCount,
          {
            category_id: item?.id,
            count: bookmarkCount as number,
          },
        ],
      };

      if (
        // index === userCategoryIds?.length - 1 &&
        // index === count?.categoryCount?.length - 1
        userCategoryIds?.length === count?.categoryCount?.length
      ) {
        resolve();
      }
    });
  });

  await buildCategoryCount.then(() => {
    if (
      isNull(bookErr) &&
      isNull(bookTrashErr) &&
      isNull(bookUnCatErr) &&
      isNull(categoryErr)
    ) {
      res.status(200).json({ data: count, error: null });
    } else {
      res.status(500).json({
        data: null,
        error: bookErr || bookTrashErr || bookUnCatErr || categoryErr,
      });
      throw new Error('ERROR');
    }
  });
}
