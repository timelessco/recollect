// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { find, isEmpty } from 'lodash';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  CollabDataInCategory,
  FetchCategoriesDataResponse,
} from '../../types/apiTypes';
import {
  CATEGORIES_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
} from '../../utils/constants';

/**
 * Fetches user categories and builds it so that we get all its colaborators data
 */

type Data = {
  data: FetchCategoriesDataResponse[] | null;
  error: PostgrestError | null | { message: string };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const userId = req.body.user_id;

  // filter onces where is_public true and userId is not same as uuid
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select(
      `
      *,
      user_id (*)
    `
    )
    .eq('user_id', userId);

  // get shared-cat data
  const { data: sharedCategoryData } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select(`*`);
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
      (collabItem) => collabItem?.userEmail === req.body.userEmail
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
  }) as FetchCategoriesDataResponse[];

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
  } else if (isEmpty(finalPublicFilteredData)) {
    res.status(500).json({
      data: null,
      error: { message: 'Something went wrong , check RLS' },
    });
  } else {
    res.status(200).json({ data: finalPublicFilteredData, error: null });
  }
}
