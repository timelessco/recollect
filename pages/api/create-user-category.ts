// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import slugify from 'slugify';
import { CategoriesData } from '../../types/apiTypes';
import { CATEGORIES_TABLE_NAME } from '../../utils/constants';

type Data = {
  data: CategoriesData[] | null;
  error: PostgrestError | null;
};

/**
 * Creats catagory for a user
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const user_id = req.body.user_id;
  const name = req.body.name;

  const { data, error } = await supabase.from(CATEGORIES_TABLE_NAME).insert([
    {
      category_name: name,
      user_id: user_id,
      category_slug: slugify(name, { lower: true }),
    },
  ]);

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
  } else {
    res.status(200).json({ data: data, error: null });
  }
}
