// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { isEmpty } from 'lodash';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { FetchSharedCategoriesData } from '../../types/apiTypes';
import { SHARED_CATEGORIES_TABLE_NAME } from '../../utils/constants';

type Data = {
  data: FetchSharedCategoriesData[] | null;
  error: PostgrestError | null | { message: string };
};

/**
 *
 * Deletes a collaborator in a category
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
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .delete()
    .match({ id: req.body.id });

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
  } else if (isEmpty(data)) {
    res
      .status(500)
      .json({ data: null, error: { message: 'Something went wrong' } });
  } else {
    res.status(200).json({ data: data, error: null });
  }
}
