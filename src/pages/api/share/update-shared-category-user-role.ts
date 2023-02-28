import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { isNull } from "lodash";
import type { NextApiResponse } from "next";

import type {
  CategoriesData,
  NextAPIReq,
  UpdateSharedCategoriesUserAccessApiPayload,
} from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";

/**
 * Updates user role for a colaborator in a category
 */

type DataRes = Array<CategoriesData> | null;
type ErrorRes = PostgrestError | null | string | jwt.VerifyErrors;

interface Data {
  data: DataRes;
  error: ErrorRes;
}

export default async function handler(
  req: NextAPIReq<UpdateSharedCategoriesUserAccessApiPayload>,
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

  const { data, error }: { data: DataRes; error: ErrorRes } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .update(req.body.updateData)
    .match({ id: req.body.id })
    .select();

  if (!isNull(data)) {
    res.status(200).json({
      data,
      error,
    });
  } else {
    res.status(500).json({ data, error });
    throw new Error("ERROR");
  }
}
