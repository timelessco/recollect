// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import isNull from "lodash/isNull";
import type { NextApiResponse } from "next";

import type {
  NextAPIReq,
  UpdateCategoryOrderApiPayload,
} from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";

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
  req: NextAPIReq<{
    category_order: Pick<UpdateCategoryOrderApiPayload, "order">;
  }>,
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

  const tokenDecode: { sub: string } = jwtDecode(req.body.access_token);
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
    throw new Error("ERROR");
  } else {
    res.status(200).json({ data: updateTargetCategoryData, error: null });
  }
}
