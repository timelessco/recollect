// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { FetchSharedCategoriesData } from '../../../types/apiTypes';
import { isAccessTokenAuthenticated } from '../../../utils/apiHelpers';
import { SHARED_CATEGORIES_TABLE_NAME } from '../../../utils/constants';

// fetches tags for a perticular user
type Data = {
  data: FetchSharedCategoriesData[] | null;
  error: PostgrestError | null | string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (!isAccessTokenAuthenticated(req.query.access_token as string)) {
    res.status(500).json({ data: null, error: 'invalid access token' });
    return;
  }
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
  } else {
    res.status(200).json({ data: data, error: null });
  }
}
