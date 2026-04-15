import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createApiClient } from "@/lib/supabase/api";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
} from "@/utils/constants";

import { FetchDiscoverableByIdInputSchema, FetchDiscoverableByIdOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-fetch-discoverable-by-id";

interface TagJoinRow {
  bookmark_id: number;
  tag_id: { id: number; name: string | null } | null;
}

interface CategoryJoinRow {
  bookmark_id: number;
  category_id: {
    category_name: string | null;
    category_slug: string;
    icon: string | null;
    icon_color: string | null;
    id: number;
  } | null;
}

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { id } = input;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.bookmark_id = id;
      }

      const { supabase } = await createApiClient();

      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select(
          "id, inserted_at, title, url, description, ogImage, screenshot, trash, type, meta_data, sort_index, make_discoverable",
        )
        .eq("id", id)
        .is("trash", null)
        .not("make_discoverable", "is", null)
        .maybeSingle();

      if (bookmarkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkError,
          message: "Failed to fetch discoverable bookmark",
          operation: "fetch_discoverable_bookmark_by_id",
        });
      }

      if (!bookmarkData) {
        throw new RecollectApiError("not_found", {
          message: "Bookmark not found or not discoverable",
        });
      }

      const [tagsResult, categoriesResult] = await Promise.all([
        supabase
          .from(BOOKMARK_TAGS_TABLE_NAME)
          .select("bookmark_id, tag_id(id, name)")
          .eq("bookmark_id", id)
          .overrideTypes<TagJoinRow[], { merge: false }>(),
        supabase
          .from(BOOKMARK_CATEGORIES_TABLE_NAME)
          .select("bookmark_id, category_id(id, category_name, category_slug, icon, icon_color)")
          .eq("bookmark_id", id)
          .overrideTypes<CategoryJoinRow[], { merge: false }>(),
      ]);

      if (tagsResult.error) {
        throw new RecollectApiError("service_unavailable", {
          cause: tagsResult.error,
          message: "Failed to fetch bookmark tags",
          operation: "fetch_bookmark_tags",
        });
      }

      if (categoriesResult.error) {
        throw new RecollectApiError("service_unavailable", {
          cause: categoriesResult.error,
          message: "Failed to fetch bookmark categories",
          operation: "fetch_bookmark_categories",
        });
      }

      const addedTags =
        tagsResult.data
          ?.filter((item) => item.tag_id !== null)
          .map((item) => ({
            id: item.tag_id?.id ?? 0,
            name: item.tag_id?.name ?? null,
          })) ?? [];

      const addedCategories =
        categoriesResult.data
          ?.filter((item) => item.category_id !== null)
          .map((item) => ({
            category_name: item.category_id?.category_name ?? null,
            category_slug: item.category_id?.category_slug ?? "",
            icon: item.category_id?.icon ?? null,
            icon_color: item.category_id?.icon_color ?? null,
            id: item.category_id?.id ?? 0,
          })) ?? [];

      if (ctx?.fields) {
        ctx.fields.tag_count = addedTags.length;
        ctx.fields.category_count = addedCategories.length;
        ctx.fields.fetched = true;
      }

      return {
        ...bookmarkData,
        addedCategories,
        addedTags,
      };
    },
    inputSchema: FetchDiscoverableByIdInputSchema,
    outputSchema: FetchDiscoverableByIdOutputSchema,
    route: ROUTE,
  }),
);
