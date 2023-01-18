// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserTagsData } from '../../../types/apiTypes';
import { BOOKMARK_TAGS_TABLE_NAME } from '../../../utils/constants';
import jwt from 'jsonwebtoken';

// removes tags for a bookmark
type Data = {
  data: UserTagsData[] | null;
  error: PostgrestError | null | { message: string } | string;
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
        throw new Error('ERROR');
      }
    }
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const { data, error } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .delete()
    .match({ tag_id: req.body?.tag_id, bookmark_id: req.body?.bookmark_id })
    .select();

  if (isEmpty(data)) {
    res
      .status(500)
      .json({ data: null, error: { message: 'Something went wrong' } });
    throw new Error('ERROR');
  }

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
    throw new Error('ERROR');
  } else {
    res.status(200).json({ data: data, error: null });
    return;
  }
}