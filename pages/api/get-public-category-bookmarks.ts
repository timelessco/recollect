// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../types/apiTypes';
import { MAIN_TABLE_NAME } from '../../utils/constants';

type Data = {
  data: SingleListData[] | null;
  error: PostgrestError | null;
};

/**
 * gets all bookmarks in a public category
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .select('*, category_id!inner(*), user_id!inner(*)')
    .eq('category_id.category_slug', req.query.category_slug)
    .eq('user_id.user_name', req.query.user_name) // we need user name filter as if we change user name in url then this page should show 404
    .eq('category_id.is_public', true);
  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
  } else {
    res.status(200).json({ data: data, error: null });
  }
}
