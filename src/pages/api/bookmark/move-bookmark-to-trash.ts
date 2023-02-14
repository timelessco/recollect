import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { isNull } from "lodash";
import type { NextApiResponse } from "next";

import type {
  MoveBookmarkToTrashApiPayload,
  NextAPIReq,
  SingleListData,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../utils/constants";

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextAPIReq<MoveBookmarkToTrashApiPayload>,
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

  const bookmarkData = req.body.data;

  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({ trash: req.body.isTrash })
    .match({ id: bookmarkData?.id })
    .select();

  if (!isNull(data)) {
    res.status(200).json({ data, error });
  } else {
    res.status(500).json({ data, error });
    throw new Error("ERROR");
  }
}
