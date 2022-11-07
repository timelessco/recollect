// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { isNull } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../../types/apiTypes';
import {
  MAIN_TABLE_NAME,
  TIMELESS_SCRAPPER_API,
} from '../../../utils/constants';
import jwt from 'jsonwebtoken';

type Data = {
  data: SingleListData[] | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
  message: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const accessToken = req.body.access_token as string;
  const url = req.body.url;
  const category_id = req.body.category_id;
  const update_access = req.body.update_access;
  const tokenDecode = jwtDecode(accessToken);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const userId = tokenDecode?.sub;

  await jwt.verify(
    accessToken as string,
    process.env.SUPABASE_JWT_SECRET_KEY as string,
    function (err) {
      if (err) {
        res.status(500).json({ data: null, error: err, message: null });
        return;
      }
    }
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const scrapperRes = await axios.post(TIMELESS_SCRAPPER_API, {
    url,
  });

  if (
    update_access === true &&
    !isNull(category_id) &&
    category_id !== 'null'
  ) {
    const { data, error } = await supabase.from(MAIN_TABLE_NAME).insert([
      {
        url: url,
        title: scrapperRes?.data?.title,
        user_id: userId,
        description: scrapperRes?.data?.description,
        ogImage: scrapperRes?.data?.OgImage,
        category_id: category_id,
      },
    ]);
    if (!isNull(error)) {
      res.status(500).json({ data: null, error: error, message: null });
      return;
    } else {
      res.status(200).json({ data: data, error: null, message: null });
      return;
    }
  } else {
    const { data, error } = await supabase.from(MAIN_TABLE_NAME).insert([
      {
        url: url,
        title: scrapperRes?.data?.title,
        user_id: userId,
        description: scrapperRes?.data?.description,
        ogImage: scrapperRes?.data?.OgImage,
        category_id: null,
      },
    ]);

    if (!isNull(error)) {
      res.status(500).json({ data: null, error: error, message: null });
      return;
    } else {
      res.status(200).json({
        data: data,
        error: null,
        message: !isNull(category_id)
          ? 'You dont have access to add to this category, this bookmark will be added without a category'
          : null,
      });
      return;
    }
  }
}
