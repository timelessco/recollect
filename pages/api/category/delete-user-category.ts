// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { isEmpty } from 'lodash';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CategoriesData } from '../../../src/types/apiTypes';
import { CATEGORIES_TABLE_NAME, PROFILES } from '../../../src/utils/constants';
import jwt from 'jsonwebtoken';
import jwtDecode from 'jwt-decode';

type Data = {
  data: CategoriesData[] | null;
  error: PostgrestError | null | { message: string } | string;
};

/**
 * Deletes catagory for a user
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

  const tokenDecode = jwtDecode(req.body.access_token);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const userId = tokenDecode?.sub;

  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .delete()
    .match({ id: req.body.category_id })
    .select();

  if (
    data &&
    !isEmpty(data) &&
    !isNull(req.body.category_order) &&
    req.body.category_order
  ) {
    // updates user category order
    const { error: orderError } = await supabase
      .from(PROFILES)
      .update({
        category_order: req.body.category_order?.filter(
          (item: number) => item !== data[0]?.id
        ),
      })
      .match({ id: userId }).select(`
      id, category_order`);

    if (!isNull(orderError)) {
      res.status(500).json({ data: null, error: orderError });
      throw new Error('ERROR');
    }
  }

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
    throw new Error('ERROR');
  } else if (isEmpty(data)) {
    res
      .status(500)
      .json({ data: null, error: { message: 'Something went wrong' } });
    throw new Error('ERROR');
  } else {
    res.status(200).json({ data: data, error: null });
    return;
  }
}
