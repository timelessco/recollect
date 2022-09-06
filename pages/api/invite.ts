// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { SHARED_CATEGORIES_TABLE_NAME } from '../../utils/constants';
import { supabase } from '../../utils/supabaseClient';
import jwt_decode from 'jwt-decode';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import { PostgrestError } from '@supabase/supabase-js';

type Data = {
  success: string | null;
  error: string | null | PostgrestError;
};

interface InviteTokenData {
  email: string;
  category_id: number;
  edit_access: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (!req?.query?.token) {
    const tokenData = jwt_decode(
      req?.query?.token as string
    ) as InviteTokenData;

    const insertData = {
      email: tokenData?.email,
      category_id: tokenData?.category_id,
      edit_access: tokenData?.edit_access,
    };

    // check if user with category Id is already there in DB
    const { data, error } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .select('*')
      .eq('category_id', insertData?.category_id)
      .eq('email', insertData?.email);

    if (isEmpty(data) && isNull(error)) {
      const {} = await supabase.from(SHARED_CATEGORIES_TABLE_NAME).insert({
        category_id: insertData?.category_id,
        email: insertData?.email,
        edit_access: false,
      });

      res.status(200).json({
        success: 'User has been added as a colaborator to the category',
        error: null,
      });
    } else {
      res.status(500).json({
        success: null,
        error: isNull(error)
          ? 'The user is alredy a colaborator of this category'
          : error,
      });
    }
  }
}
