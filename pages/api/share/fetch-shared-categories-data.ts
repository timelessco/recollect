// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { FetchSharedCategoriesData } from '../../../src/types/apiTypes';
import { SHARED_CATEGORIES_TABLE_NAME } from '../../../src/utils/constants';
import jwt from 'jsonwebtoken';

// fetches shared categories
type Data = {
  data: FetchSharedCategoriesData[] | null;
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

  const { data, error } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select();
  // .eq('email', email); // TODO: check and remove

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
    return;
  } else {
    res.status(200).json({ data: data, error: null });
    return;
  }
}
