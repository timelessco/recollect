import type { FetchPublicBookmarkByIdOutput } from "./schema";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
} from "@/utils/constants";
import { toDbType } from "@/utils/type-utils";

import { FetchPublicBookmarkByIdInputSchema, FetchPublicBookmarkByIdOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-fetch-public-bookmark-by-id";

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { bookmark_id: bookmarkId, category_slug: categorySlug, user_name: userName } = input;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.bookmark_id = bookmarkId;
      }
      setPayload(ctx, {
        category_slug: categorySlug,
        user_name: userName,
      });

      // Service-role client bypasses RLS — this endpoint is intentionally public and
      // performs its own public/ownership gating below (is_public + user_name match).
      const supabase = createServerServiceClient();

      const { data: categoryData, error: categoryError } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .select(
          `
            id,
            user_id (
              user_name
            ),
            is_public
          `,
        )
        .eq("category_slug", categorySlug)
        .maybeSingle();

      if (categoryError) {
        throw new RecollectApiError("service_unavailable", {
          cause: categoryError,
          context: { category_slug: categorySlug },
          message: "Failed to fetch category",
          operation: "fetch_category",
        });
      }

      if (!categoryData) {
        throw new RecollectApiError("not_found", {
          context: { category_slug: categorySlug },
          message: "Category not found",
          operation: "fetch_category",
        });
      }

      if (categoryData.user_id?.user_name !== userName) {
        throw new RecollectApiError("not_found", {
          context: { category_slug: categorySlug, user_name: userName },
          message: "Username mismatch",
          operation: "verify_category_owner",
        });
      }

      if (!categoryData.is_public) {
        throw new RecollectApiError("forbidden", {
          context: { category_slug: categorySlug },
          message: "Category is not public",
          operation: "verify_category_public",
        });
      }

      const categoryId = categoryData.id;

      if (ctx?.fields) {
        ctx.fields.category_id = categoryId;
      }

      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select(
          `
            *,
            ${BOOKMARK_CATEGORIES_TABLE_NAME}!inner (
              category_id
            ),
            user_id!inner (
              user_name
            )
          `,
        )
        .eq("id", bookmarkId)
        .eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, categoryId)
        .is("trash", null)
        .maybeSingle();

      if (bookmarkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkError,
          context: { bookmark_id: bookmarkId, category_id: categoryId },
          message: "Failed to fetch bookmark",
          operation: "fetch_bookmark",
        });
      }

      if (!bookmarkData) {
        throw new RecollectApiError("not_found", {
          context: { bookmark_id: bookmarkId, category_id: categoryId },
          message: "Bookmark not found in category",
          operation: "fetch_bookmark",
        });
      }

      // Strip junction-table join artifact before returning
      const { [BOOKMARK_CATEGORIES_TABLE_NAME]: _removed, ...cleanedBookmark } = bookmarkData;

      setPayload(ctx, { bookmark_fetched: true });

      return toDbType<FetchPublicBookmarkByIdOutput>(cleanedBookmark);
    },
    inputSchema: FetchPublicBookmarkByIdInputSchema,
    outputSchema: FetchPublicBookmarkByIdOutputSchema,
    route: ROUTE,
  }),
);
