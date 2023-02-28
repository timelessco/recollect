// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import isNull from "lodash/isNull";
import type { NextApiRequest, NextApiResponse } from "next";

import type { SingleListData } from "../../types/apiTypes";
import { CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "../../utils/constants";
import { getUserNameFromEmail } from "../../utils/helpers";

type DataRes = SingleListData[] | null;
type ErrorRes = PostgrestError | null | string;
interface Data {
  data: DataRes;
  error: ErrorRes;
}

/**
 * gets all bookmarks in a public category
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  // get category data
  const { data: categoryData, error: categoryError } = (await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select(
      `
      user_id (
        email
      )
    `,
    )
    .eq("category_slug", req.query.category_slug)) as unknown as {
    data: Array<{ user_id: { email: string } }>;
    error: PostgrestError;
  };

  const urlUserName = getUserNameFromEmail(categoryData[0]?.user_id?.email);

  if (urlUserName !== req.query.user_name) {
    // this is to check if we change user name in url then this page should show 404
    // status is 200 as DB is not giving any error
    res
      .status(200)
      .json({ data: null, error: "username mismatch from url query" });
  } else {
    const { data, error } = (await supabase
      .from(MAIN_TABLE_NAME)
      .select("*, category_id!inner(*), user_id!inner(*)")
      .eq("category_id.category_slug", req.query.category_slug)
      // .eq('user_id.user_name', req.query.user_name) // if this is there then collabs bookmakrs are not coming
      .eq("category_id.is_public", true)) as unknown as {
      data: DataRes;
      error: ErrorRes;
    };

    if (!isNull(error) || !isNull(categoryError)) {
      res.status(500).json({ data: null, error });
      throw new Error("ERROR");
    } else {
      res.status(200).json({ data, error: null });
    }
  }
}
