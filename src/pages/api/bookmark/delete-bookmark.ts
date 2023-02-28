import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { isNull } from "lodash";
import type { NextApiResponse } from "next";

import type { NextAPIReq, SingleListData } from "../../../types/apiTypes";
import {
  BOOKMAKRS_STORAGE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
} from "../../../utils/constants";

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

type DataRes = Array<SingleListData> | null;
type ErrorRes = PostgrestError | null | string | jwt.VerifyErrors;
interface Data {
  data: DataRes;
  error: ErrorRes;
}

export default async function handler(
  req: NextAPIReq<{
    data: { id: string; screenshot: string };
  }>,
  res: NextApiResponse<Data>,
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const bookmarkData = req.body.data;

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

  const screenshot = bookmarkData?.screenshot;
  const screenshotImgName =
    screenshot?.split("/")[screenshot.split("/").length - 1];

  await supabase.storage
    .from(BOOKMAKRS_STORAGE_NAME)
    .remove([`public/${screenshotImgName}`]);

  await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .delete()
    .match({ bookmark_id: bookmarkData?.id })
    .select();

  const { data, error }: { data: DataRes; error: ErrorRes } = await supabase
    .from(MAIN_TABLE_NAME)
    .delete()
    .match({ id: bookmarkData?.id })
    .select();

  if (!isNull(data)) {
    res.status(200).json({ data, error });
  } else {
    res.status(500).json({ data, error });
    throw new Error("ERROR");
  }
}
