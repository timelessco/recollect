// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";
import type { NextApiResponse } from "next";

import type {
  CategoriesData,
  NextAPIReq,
  UpdateUserProfileApiPayload,
} from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";

type Data = {
  data: CategoriesData[] | null;
  error: PostgrestError | null | { message: string } | string;
};

/**
 * Updates profile for a user
 */

export default async function handler(
  req: NextAPIReq<UpdateUserProfileApiPayload>,
  res: NextApiResponse<Data>,
) {
  jwt.verify(
    req.body.access_token,
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
    .from(PROFILES)
    .update(req.body.updateData)
    .match({ id: req.body.id })
    .select();

  if (!isNull(error)) {
    res.status(500).json({
      data: null,
      error: isEmpty(error) ? { message: "Something went wrong" } : error,
    });
    throw new Error("ERROR");
  } else if (isEmpty(data) || isNull(data)) {
    res
      .status(500)
      .json({ data: null, error: { message: "Something went wrong" } });
    throw new Error("ERROR");
  } else {
    res.status(200).json({ data, error: null });
  }
}
