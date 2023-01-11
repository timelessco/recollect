// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { PROFILES } from '../../../src/utils/constants';
import jwt from 'jsonwebtoken';
import jwtDecode from 'jwt-decode';

type resType = {
  id: string;
  category_order: string[];
} | null;

type Data = {
  data: resType;
  error: PostgrestError | null | { message: string } | string;
};

/**
 * Updates catagory order for a user
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

  const { data: updateTargetCategoryData, error: updateTargetCategoryError } =
    (await supabase
      .from(PROFILES)
      .update({
        category_order: isNull(req.body.category_order)
          ? []
          : req.body.category_order,
      })
      .match({ id: userId }).select(`
      id, category_order`)) as Data;

  if (!isNull(updateTargetCategoryError)) {
    res.status(500).json({
      data: null,
      error: updateTargetCategoryError,
    });
    throw new Error('ERROR');
  } else {
    res.status(200).json({ data: updateTargetCategoryData, error: null });
    return;
  }
}
