/** @deprecated Use v2 route at /api/v2/category/update-category-order instead. Kept for mobile/extension consumers. */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiResponse } from "next";

import isNull from "lodash/isNull";

import type {
  NextApiRequest,
  SingleListData,
  UpdateCategoryOrderApiPayload,
} from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type responseType = {
  category_order: string[];
  id: string;
} | null;

interface Data {
  data: responseType;
  error: { message: string } | null | PostgrestError | string;
}

/**
 * Updates category order for a user
 */

export default async function handler(
  request: NextApiRequest<{
    category_order: Pick<UpdateCategoryOrderApiPayload, "order">;
    user_id: SingleListData["user_id"]["id"];
  }>,
  response: NextApiResponse<Data>,
) {
  const supabase = apiSupabaseClient(request, response);

  const authResult = await supabase?.auth?.getUser();
  const userId = authResult?.data?.user?.id;

  const { data: updateTargetCategoryData, error: updateTargetCategoryError } = (await supabase
    .from(PROFILES)
    .update({
      category_order: isNull(request.body.category_order) ? [] : request.body.category_order,
    })
    .match({ id: userId }).select(`
      id, category_order`)) as Data;

  if (!isNull(updateTargetCategoryError)) {
    response.status(500).json({
      data: null,
      error: updateTargetCategoryError,
    });
    throw new Error("ERROR");
  } else {
    response.status(200).json({ data: updateTargetCategoryData, error: null });
  }
}
