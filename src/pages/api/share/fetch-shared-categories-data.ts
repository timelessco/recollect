// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import isNull from "lodash/isNull";
import type { NextApiRequest, NextApiResponse } from "next";

import type { FetchSharedCategoriesData } from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";

// fetches shared categories
type Data = {
  data: FetchSharedCategoriesData[] | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  jwt.verify(
    req.query.access_token as string,
    process.env.SUPABASE_JWT_SECRET_KEY,
    function (err) {
      if (err) {
        res.status(500).json({ data: null, error: err });
        throw new Error("ERROR");
      }
    },
  );
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const { data, error } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select();
  // .eq('email', email); // TODO: check and remove

  if (!isNull(error)) {
    res.status(500).json({ data: null, error });
    throw new Error("ERROR");
  } else {
    res.status(200).json({ data, error: null });
  }
}
