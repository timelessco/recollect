import type { NextApiRequest, NextApiResponse } from 'next';
import { CategoriesData } from '../../../types/apiTypes';
import { SHARED_CATEGORIES_TABLE_NAME } from '../../../utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { isAccessTokenAuthenticated } from '../../../utils/apiHelpers';

/**
 * Updates user role for a colaborator in a category
 */

type Data = {
  data: Array<CategoriesData> | null;
  error: PostgrestError | null | string;
};

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
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .update(req.body.updateData)
    .match({ id: req.body.id });

  if (!isNull(data)) {
    res.status(200).json({
      data,
      error,
    });
  } else {
    res.status(500).json({ data, error });
  }
}
