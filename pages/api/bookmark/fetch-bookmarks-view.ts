import type { NextApiRequest, NextApiResponse } from 'next';
import { BookmarkViewDataTypes } from '../../../src/types/apiTypes';
import { CATEGORIES_TABLE_NAME } from '../../../src/utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// this fetches bookmarks view based on category

type Data = {
  data: { category_views: BookmarkViewDataTypes }[] | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await jwt.verify(
    req.body.access_token as string,
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

  const category_id = req.body.category_id;

  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select(
      `
      category_views
    `
    )
    .eq('id', category_id);

  if (!isNull(data)) {
    res.status(200).json({ data, error });
    return;
  } else {
    res.status(500).json({ data, error });
    return;
  }
}
