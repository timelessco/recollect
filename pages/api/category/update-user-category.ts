// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { isEmpty } from 'lodash';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CategoriesData } from '../../../types/apiTypes';
import { isAccessTokenAuthenticated } from '../../../utils/apiHelpers';
import { CATEGORIES_TABLE_NAME } from '../../../utils/constants';

type Data = {
  data: CategoriesData[] | null;
  error: PostgrestError | null | { message: string } | string;
};

/**
 * Updates catagory for a user
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (!isAccessTokenAuthenticated(req.body.access_token)) {
    res.status(500).json({ data: null, error: 'invalid access token' });
    return;
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .update(req.body.updateData)
    .match({ id: req.body.category_id });

  if (!isNull(error)) {
    res.status(500).json({
      data: null,
      error: isEmpty(error) ? { message: 'Something went wrong' } : error,
    });
  } else if (isEmpty(data) || isNull(data)) {
    res
      .status(500)
      .json({ data: null, error: { message: 'Something went wrong' } });
  } else {
    res.status(200).json({ data: data, error: null });
  }
}
