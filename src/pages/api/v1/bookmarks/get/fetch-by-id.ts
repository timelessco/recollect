/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/bookmarks/get/fetch-by-id
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type {
  BookmarksWithCategoriesWithCategoryForeignKeys,
  NextApiRequest,
  SingleListData,
} from "../../../../../types/apiTypes";

import { BOOKMARK_CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "../../../../../utils/constants";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

interface RequestType {
  data: Pick<SingleListData, "id">;
}

interface ResponseType {
  data: null | SingleListData[];
  error: null | string;
}

const getBodySchema = () =>
  z.object({
    id: z.string(),
  });

// Scoped RLS can hide the joined category row, so the FK side returns null — drop those before mapping.
type CategoryJoinRow = BookmarksWithCategoriesWithCategoryForeignKeys[number];
const hasCategory = (
  row: CategoryJoinRow,
): row is CategoryJoinRow & { category_id: NonNullable<CategoryJoinRow["category_id"]> } =>
  row.category_id !== null;

/**
 * This api fetches bookmark by its id
 * @param {NextApiRequest<RequestType>} request - The incoming API request
 * @param {NextApiResponse<ResponseType>} response - The outgoing API response
 * @returns {Promise<NextApiResponse<ResponseType>>} - Fetched bookmark or error
 */
export default async function handler(
  request: NextApiRequest<RequestType>,
  response: NextApiResponse<ResponseType>,
) {
  if (request.method !== "GET") {
    response.status(405).send({ data: null, error: "Only GET requests allowed" });
    return;
  }

  try {
    const schema = getBodySchema();
    const bodyData = schema.parse(request.query);
    const supabase = apiSupabaseClient(request, response);

    const authResult = await supabase?.auth?.getUser();
    const userId = authResult?.data?.user?.id;

    const bookmarkId = Number.parseInt(bodyData?.id, 10);

    const { data, error } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("*")
      .eq("user_id", userId)
      .eq("id", bookmarkId);

    if (error) {
      response.status(500).send({ data: null, error: "fetch error" });
      Sentry.captureException(`fetch error`);
      return;
    }

    // Fetch categories via junction table
    const { data: categoriesData } = await supabase
      .from(BOOKMARK_CATEGORIES_TABLE_NAME)
      .select(
        `
				bookmark_id,
				category_id (
					id,
					category_name,
					category_slug,
					icon,
					icon_color
				)
			`,
      )
      .eq("bookmark_id", bookmarkId)
      .eq("user_id", userId);

    // Construct addedCategories array.
    const bookmarkCategories =
      categoriesData as unknown as BookmarksWithCategoriesWithCategoryForeignKeys;
    const addedCategories = bookmarkCategories?.filter(hasCategory).map((item) => ({
      category_name: item.category_id.category_name,
      category_slug: item.category_id.category_slug,
      icon: item.category_id.icon,
      icon_color: item.category_id.icon_color,
      id: item.category_id.id,
    }));

    // Add categories to bookmark data
    const dataWithCategories = data?.map((bookmark) => ({
      ...bookmark,
      addedCategories: addedCategories ?? [],
    }));

    response.status(200).send({ data: dataWithCategories, error: null });
  } catch {
    response.status(400).send({ data: null, error: "Error in payload data" });
  }
}
