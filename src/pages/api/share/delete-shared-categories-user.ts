// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import isNull from "lodash/isNull";

import {
  type DeleteSharedCategoriesUserApiPayload,
  type FetchSharedCategoriesData,
  type NextApiRequest,
} from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = FetchSharedCategoriesData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
  data: DataResponse;
  error: ErrorResponse;
};

/**
 *
 * Deletes a collaborator in a category
 */

export default async function handler(
  request: NextApiRequest<DeleteSharedCategoriesUserApiPayload>,
  response: NextApiResponse<Data>,
) {
  const supabase = apiSupabaseClient(request, response);
  const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

  const { data, error }: { data: DataResponse; error: ErrorResponse } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .delete()
    .match({ id: request.body.id, user_id: userId })
    .select();

  if (!isNull(error)) {
    response.status(500).json({ data: null, error });
    throw new Error("ERROR");
  }

  if (!data || data.length === 0) {
    response.status(500).json({ data: null, error: { message: "Something went wrong" } });
    throw new Error("ERROR");
  }

  // Clean up favorite_categories for the departing user (atomic array_remove)
  const categoryId = data[0].category_id;
  const { error: favCleanupError } = await supabase.rpc("remove_favorite_category_for_user", {
    p_category_id: categoryId,
  });

  if (favCleanupError) {
    console.error("[delete-shared-categories-user] Failed to clean up favorite_categories:", {
      error: favCleanupError,
      categoryId,
      userId,
    });
    Sentry.captureException(new Error(favCleanupError.message), {
      tags: { operation: "cleanup_favorite_categories", userId },
      extra: {
        categoryId,
        code: favCleanupError.code,
        details: favCleanupError.details,
        hint: favCleanupError.hint,
      },
    });
  }

  response.status(200).json({ data, error: null });
}
