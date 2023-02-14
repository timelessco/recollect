import { createClient, type PostgrestError } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { isNull } from "lodash";
import type { NextApiResponse } from "next";

import type {
  BookmarkViewDataTypes,
  NextAPIReq,
} from "../../../types/apiTypes";
import { CATEGORIES_TABLE_NAME } from "../../../utils/constants";

// this fetches bookmarks view based on category

type Data = {
  data: { category_views: BookmarkViewDataTypes }[] | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextAPIReq<{ category_id: number }>,
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

  const { category_id: categorieId } = req.body;

  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select(
      `
      category_views
    `,
    )
    .eq("id", categorieId);

  if (!isNull(data)) {
    res.status(200).json({ data, error });
  } else {
    res.status(500).json({ data, error });
    throw new Error("ERROR");
  }
}
