// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";
import type { NextApiRequest, NextApiResponse } from "next";

import type { UserTagsData } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";

// fetches profiles data for a perticular user
type Data = {
  data: UserTagsData[] | null;
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

  const userId = req.query.user_id;

  if (!userId || isEmpty(userId)) {
    res.status(500).json({ data: null, error: "User id is missing" });
    throw new Error("ERROR");
  }

  const { data, error } = await supabase
    .from(PROFILES)
    .select(`*`)
    .eq("id", userId);

  if (!isNull(error)) {
    res.status(500).json({ data: null, error });
    throw new Error("ERROR");
  } else {
    res.status(200).json({ data, error: null });
  }
}
