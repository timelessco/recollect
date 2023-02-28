// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import type { NextApiResponse } from "next";

import type { NextAPIReq, UserTagsData } from "../../../types/apiTypes";
import { BOOKMARK_TAGS_TABLE_NAME } from "../../../utils/constants";

// removes tags for a bookmark

type DataRes = UserTagsData[] | null;
type ErrorRes = PostgrestError | null | { message: string } | string;

interface Data {
  data: DataRes;
  error: ErrorRes;
}

export default async function handler(
  req: NextAPIReq<{ tag_id: number; bookmark_id: number }>,
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
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .delete()
    .match({ tag_id: req.body?.tag_id, bookmark_id: req.body?.bookmark_id })
    .select();

  if (isEmpty(data)) {
    res
      .status(500)
      .json({ data: null, error: { message: "Something went wrong" } });
    throw new Error("ERROR");
  }

  if (!isNull(error)) {
    res.status(500).json({ data: null, error });
    throw new Error("ERROR");
  } else {
    res.status(200).json({ data, error: null });
  }
}
