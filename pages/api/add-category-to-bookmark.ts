import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../types/apiTypes';
import { MAIN_TABLE_NAME } from '../../utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null;
  message: string | null;
};

// this api adds catagory to a bookmark
// it upadates cateogry based on the user's access role for the category
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
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
    .match({ id: bookmark_id });

  if (!isNull(data)) {
    res.status(200).json({
      data,
      error,
      message: update_access
        ? null
        : 'You dont have access to add to this category, this bookmark will be added without a category',
    });
  } else {
    res.status(500).json({ data, error, message: null });
  }
}
