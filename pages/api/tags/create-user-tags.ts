// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserTagsData } from '../../../src/types/apiTypes';
import { TAG_TABLE_NAME } from '../../../src/utils/constants';
import jwt from 'jsonwebtoken';

type Data = {
  data: UserTagsData[] | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

// creats tags for a specific user

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

  const userId = req.body.user_id;
  const name = req.body.name;

  const { data, error } = await supabase
    .from(TAG_TABLE_NAME)
    .insert([
      {
        name: name,
        user_id: userId,
      },
    ])
    .select();

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
    return;
  } else {
    res.status(200).json({ data: data, error: null });
    return;
  }
}
