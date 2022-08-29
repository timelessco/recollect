// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { SHARED_CATEGORIES_TABLE_NAME } from '../../utils/constants';
import { supabase } from '../../utils/supabaseClient';
import jwt_decode from 'jwt-decode';

type Data = {
  name: string;
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
  if (req?.query?.token) {
    const tokenData = jwt_decode(
      req?.query?.token as string
    ) as InviteTokenData;

    const insertData = {
      email: tokenData?.email,
      category_id: tokenData?.category_id,
      edit_access: tokenData?.edit_access,
    };

    const {} = await supabase.from(SHARED_CATEGORIES_TABLE_NAME).insert({
      category_id: insertData?.category_id,
      email: insertData?.email,
      edit_access: false,
    });
  }

  res.status(200).json({ name: 'John Doe' });
}
