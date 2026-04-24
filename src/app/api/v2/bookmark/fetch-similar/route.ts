import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
} from "@/utils/constants";

import { FetchSimilarInputSchema, FetchSimilarOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-fetch-similar";

// Passed explicitly to the RPC; override of the RPC default for tuning.
// Phase A visual + entity look-alike: max score is 42
// (6 × up-to-3 color matches + 3 × type + 4 × object + 8 × people
//  + 5 × creator (brand/author/artist/director/company/character/series)
//  + 2 × classifier (platform/source/programming_language/framework/genre/location)
//  + 2 × domain (same url host, www. stripped)).
// MIN_SCORE = 3 means any single weak signal (type match) clears the floor;
// stronger signals (color, people, creator) clear it easily.
const MIN_SCORE = 3;

interface BookmarkRow {
  description: string | null;
  enriched_at: string | null;
  enrichment_status: string | null;
  id: number;
  inserted_at: string;
  make_discoverable: string | null;
  meta_data: unknown;
  ogImage: string | null;
  screenshot: string | null;
  sort_index: string | null;
  title: string | null;
  trash: string | null;
  type: string | null;
  url: string | null;
  user_id: string;
}

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

const hasTag = (
  row: TagJoinRow,
): row is TagJoinRow & { tag_id: NonNullable<TagJoinRow["tag_id"]> } => row.tag_id !== null;

const hasCategory = (
  row: CategoryJoinRow,
): row is CategoryJoinRow & { category_id: NonNullable<CategoryJoinRow["category_id"]> } =>
  row.category_id !== null;

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { bookmark_id } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmark_id;
      }

      const { data: scored, error: rpcError } = await supabase.rpc("match_similar_bookmarks", {
        p_bookmark_id: bookmark_id,
        p_min_score: MIN_SCORE,
      });

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to compute similar bookmarks",
          operation: "match_similar_bookmarks",
        });
      }

      if (!scored || scored.length === 0) {
        setPayload(ctx, { similar_count: 0, empty_result: true });
        return [];
      }

      setPayload(ctx, { similar_count: scored.length, empty_result: false });

      const scoreById = new Map(scored.map((row) => [row.id, row.score]));
      const bookmarkIds = scored.map((row) => row.id);

      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select("*")
        .in("id", bookmarkIds)
        .eq("user_id", userId)
        .is("trash", null)
        .overrideTypes<BookmarkRow[], { merge: false }>();

      if (bookmarkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkError,
          message: "Failed to fetch similar bookmark rows",
          operation: "fetch_similar_rows",
        });
      }

      if (!bookmarkData || bookmarkData.length === 0) {
        return [];
      }

      const [tagsResult, categoriesResult] = await Promise.all([
        supabase
          .from(BOOKMARK_TAGS_TABLE_NAME)
          .select("bookmark_id, tag_id(id, name)")
          .in("bookmark_id", bookmarkIds)
          .overrideTypes<TagJoinRow[], { merge: false }>(),
        supabase
          .from(BOOKMARK_CATEGORIES_TABLE_NAME)
          .select("bookmark_id, category_id(id, category_name, category_slug, icon, icon_color)")
          .in("bookmark_id", bookmarkIds)
          .order("created_at", { ascending: true })
          .overrideTypes<CategoryJoinRow[], { merge: false }>(),
      ]);

      if (tagsResult.error) {
        throw new RecollectApiError("service_unavailable", {
          cause: tagsResult.error,
          message: "Failed to fetch similar bookmark tags",
          operation: "fetch_similar_tags",
        });
      }

      if (categoriesResult.error) {
        throw new RecollectApiError("service_unavailable", {
          cause: categoriesResult.error,
          message: "Failed to fetch similar bookmark categories",
          operation: "fetch_similar_categories",
        });
      }

      const { data: bookmarksWithTags } = tagsResult;
      const { data: bookmarksWithCategories } = categoriesResult;

      // Stitch tags + categories and the score onto each row; preserve RPC ordering
      // (score desc, inserted_at desc) — PostgREST .in() does not honor the RPC's order.
      const stitched = bookmarkData.map((item) => {
        const matchedTags = bookmarksWithTags
          ?.filter((tagItem) => tagItem.bookmark_id === item.id)
          .filter(hasTag);
        const matchedCategories = bookmarksWithCategories
          ?.filter((catItem) => catItem.bookmark_id === item.id)
          .filter(hasCategory);

        return {
          ...item,
          addedCategories:
            matchedCategories && matchedCategories.length > 0
              ? matchedCategories.map((matchedItem) => ({
                  category_name: matchedItem.category_id.category_name,
                  category_slug: matchedItem.category_id.category_slug,
                  icon: matchedItem.category_id.icon,
                  icon_color: matchedItem.category_id.icon_color,
                  id: matchedItem.category_id.id,
                }))
              : [],
          addedTags:
            matchedTags && matchedTags.length > 0
              ? matchedTags.map((matchedItem) => ({
                  id: matchedItem.tag_id.id,
                  name: matchedItem.tag_id.name,
                }))
              : [],
          similarity_score: scoreById.get(item.id) ?? 0,
        };
      });

      const rankOf = (id: number) => bookmarkIds.indexOf(id);
      stitched.sort((a, b) => rankOf(a.id) - rankOf(b.id));

      return stitched;
    },
    inputSchema: FetchSimilarInputSchema,
    outputSchema: FetchSimilarOutputSchema,
    route: ROUTE,
  }),
);
