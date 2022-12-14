import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../../src/types/apiTypes';
import {
  ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
  MAIN_TABLE_NAME,
} from '../../../src/utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
  message: string | null;
};

// this api adds catagory to a bookmark
// it upadates cateogry based on the user's access role for the category
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await jwt.verify(
    req.body.access_token as string,
    process.env.SUPABASE_JWT_SECRET_KEY as string,
    function (err) {
      if (err) {
        res.status(500).json({ data: null, error: err, message: null });
        return;
      }
    }
  );
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const category_id = req.body.category_id;
  const bookmark_id = req.body.bookmark_id;
  const update_access = req.body.update_access;

  // only if user is owner , or user has edit access they can update the bookmark category in the table, or else bookmark will be added with category null

  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({ category_id: update_access ? category_id : null })
    .match({ id: bookmark_id })
    .select();

  if (!isNull(data)) {
    res.status(200).json({
      data,
      error,
      message: update_access ? null : ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
    });
    return;
  } else {
    res.status(500).json({ data, error, message: null });
    return;
  }
}
