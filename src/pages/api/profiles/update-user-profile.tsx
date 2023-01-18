// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { isEmpty } from 'lodash';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CategoriesData } from '../../../types/apiTypes';
import { PROFILES } from '../../../utils/constants';
import jwt from 'jsonwebtoken';

type Data = {
  data: CategoriesData[] | null;
  error: PostgrestError | null | { message: string } | string;
};

/**
 * Updates profile for a user
 */

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
    .from(PROFILES)
    .update(req.body.updateData)
    .match({ id: req.body.id })
    .select();

  if (!isNull(error)) {
    res.status(500).json({
      data: null,
      error: isEmpty(error) ? { message: 'Something went wrong' } : error,
    });
    throw new Error('ERROR');
  } else if (isEmpty(data) || isNull(data)) {
    res
      .status(500)
      .json({ data: null, error: { message: 'Something went wrong' } });
    throw new Error('ERROR');
  } else {
    res.status(200).json({ data: data, error: null });
    return;
  }
}
