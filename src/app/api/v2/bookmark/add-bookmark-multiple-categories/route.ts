import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { addBookmarkMinData } from "@/lib/bookmarks/add-bookmark-min-data";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "@/utils/category-auth";
import { BOOKMARK_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import {
  AddBookmarkMultipleCategoriesInputSchema,
  AddBookmarkMultipleCategoriesOutputSchema,
} from "./schema";

const ROUTE = "v2-bookmark-add-bookmark-multiple-categories";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const { email } = user;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.url = data.url;
        ctx.fields.category_ids = data.category_ids;
      }

      // Validate access for all non-zero categories upfront (fail fast before bookmark creation)
      const nonZeroCategoryIds = data.category_ids.filter((id) => id !== 0);
      if (nonZeroCategoryIds.length > 0) {
        const accessResults = await Promise.all(
          nonZeroCategoryIds.map(async (categoryId) => {
            const hasAccess = await checkIfUserIsCategoryOwnerOrCollaborator({
              categoryId,
              email: email ?? "",
              supabase,
              userId,
            });
            return { categoryId, hasAccess };
          }),
        );

        const deniedCategories = accessResults.filter((r) => !r.hasAccess);
        if (deniedCategories.length > 0) {
          throw new RecollectApiError("forbidden", {
            context: { denied_category_ids: deniedCategories.map((r) => r.categoryId) },
            message:
              "User is neither owner or collaborator for one or more collections or does not have edit access",
            operation: "check_category_access",
          });
        }
      }

      // Create bookmark with first category (handles junction, revalidation, enrichment)
      const [primaryCategoryId, ...remainingCategoryIds] = data.category_ids;

      const insertedData = await addBookmarkMinData({
        categoryId: primaryCategoryId,
        email,
        supabase,
        updateAccess: data.update_access,
        url: data.url,
        userId,
      });

      // Add junction entries for remaining categories
      if (remainingCategoryIds.length > 0) {
        const bookmarkId = insertedData[0].id;
        const junctionRows = remainingCategoryIds.map((categoryId) => ({
          bookmark_id: bookmarkId,
          category_id: categoryId,
          user_id: userId,
        }));

        const { error: junctionError } = await supabase
          .from(BOOKMARK_CATEGORIES_TABLE_NAME)
          .insert(junctionRows);

        if (junctionError && ctx?.fields) {
          ctx.fields.remaining_junction_error = true;
          ctx.fields.remaining_junction_error_code = junctionError.code;
        }

        // Revalidate remaining non-zero categories
        const remainingNonZero = remainingCategoryIds.filter((id) => id !== 0);
        for (const categoryId of remainingNonZero) {
          void revalidateCategoryIfPublic(categoryId, {
            operation: "add_bookmark",
            userId,
          });
        }
      }

      return insertedData.map(({ category_id: _, ...rest }) => ({
        ...rest,
        category_ids: data.category_ids,
      }));
    },
    inputSchema: AddBookmarkMultipleCategoriesInputSchema,
    outputSchema: AddBookmarkMultipleCategoriesOutputSchema,
    route: ROUTE,
  }),
);
