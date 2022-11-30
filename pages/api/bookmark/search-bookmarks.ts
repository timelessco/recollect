import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../../types/apiTypes';
import { TRASH_URL, UNCATEGORIZED_URL } from '../../../utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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

  let query = supabase
    .rpc('search_bookmarks', {
      search_text: req.query.search,
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

  if (!isNull(data)) {
    res.status(200).json({ data, error });
    return;
  } else {
    res.status(500).json({ data, error });
    return;
  }
}
