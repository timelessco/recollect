import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { isNull } from "lodash";
import type { NextApiResponse } from "next";

import type {
  AddCategoryToBookmarkApiPayload,
  NextAPIReq,
  SingleListData,
} from "../../../types/apiTypes";
import {
  ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
  MAIN_TABLE_NAME,
} from "../../../utils/constants";

type DataRes = Array<SingleListData> | null;
type ErrorRes = PostgrestError | null | string | jwt.VerifyErrors;

interface Data {
  data: DataRes;
  error: ErrorRes;
  message: string | null;
}

// this api adds catagory to a bookmark
// it upadates cateogry based on the user's access role for the category
export default async function handler(
  req: NextAPIReq<AddCategoryToBookmarkApiPayload>,
  res: NextApiResponse<Data>,
) {
  jwt.verify(
    req.body.access_token,
    process.env.SUPABASE_JWT_SECRET_KEY,
    function (err) {
      if (err) {
        res.status(500).json({ data: null, error: err, message: null });
        throw new Error("ERROR");
      }
    },
  );
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const { category_id: categoryId } = req.body;
  const { bookmark_id: bookmarkId } = req.body;
  const { update_access: updateAccess } = req.body;

  // only if user is owner , or user has edit access they can update the bookmark category in the table, or else bookmark will be added with category null

  const { data, error }: { data: DataRes; error: ErrorRes } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({ category_id: updateAccess ? categoryId : null })
    .match({ id: bookmarkId })
    .select();

  if (!isNull(data)) {
    res.status(200).json({
      data,
      error,
      message: updateAccess ? null : ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
    });
  } else {
    res.status(500).json({ data, error, message: null });
    throw new Error("ERROR");
  }
}
