import type { NextApiResponse } from "next";

import isNull from "lodash/isNull";

import type { BookmarkViewDataTypes, NextApiRequest } from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this fetches bookmarks view based on category

interface Data {
  data: { category_views: BookmarkViewDataTypes }[] | null;
  error: null | PostgrestError | string | VerifyErrors;
}

export default async function handler(
  request: NextApiRequest<{ category_id: number }>,
  response: NextApiResponse<Data>,
) {
  const supabase = apiSupabaseClient(request, response);

  const { category_id: categorieId } = request.body;

  const authResult = await supabase?.auth?.getUser();
  const userId = authResult?.data?.user?.id;

  const { data, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select(
      `
      category_views
    `,
    )
    .eq("id", categorieId)
    .eq("user_id", userId);

  if (!isNull(data)) {
    response.status(200).json({ data, error });
  } else {
    response.status(500).json({ data, error });
    throw new Error("ERROR: fetch bookmarks views db error");
  }
}
