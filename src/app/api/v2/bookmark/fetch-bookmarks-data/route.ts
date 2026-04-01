import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { getBookmarkMediaCategoryPredicate } from "@/utils/bookmark-category-filters";
import { isUserOwnerOrAnyCollaborator } from "@/utils/category-auth";
import {
  AUDIO_URL,
  BOOKMARK_CATEGORIES_TABLE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  bookmarkType,
  DOCUMENTS_URL,
  IMAGES_URL,
  INSTAGRAM_URL,
  instagramType,
  LINKS_URL,
  MAIN_TABLE_NAME,
  PAGINATION_LIMIT,
  TRASH_URL,
  TWEETS_URL,
  tweetType,
  UNCATEGORIZED_URL,
  VIDEOS_URL,
} from "@/utils/constants";

import { FetchBookmarksDataInputSchema, FetchBookmarksDataOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-fetch-bookmarks-data";

// Supabase type inference fails on dynamic select strings and FK join syntax.
// These interfaces match the actual runtime shapes for .overrideTypes<T>() usage.
interface BookmarkRow {
  category_id: number;
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
  user_id: string | { id: string; profile_pic: string | null };
}

interface TagJoinRow {
  bookmark_id: number;
  tag_id: { id: number; name: string | null };
}

interface CategoryJoinRow {
  bookmark_id: number;
  category_id: {
    category_name: string | null;
    category_slug: string;
    icon: string | null;
    icon_color: string | null;
    id: number;
  };
}

/**
 * Checks if category_id represents a specific numeric category (not a special view
 * like trash, tweets, links, etc.). Ported from helpers.ts to avoid next/router import.
 */
function isNumericCategory(categoryId: string): boolean {
  return (
    categoryId !== "null" &&
    categoryId !== TRASH_URL &&
    categoryId !== IMAGES_URL &&
    categoryId !== VIDEOS_URL &&
    categoryId !== DOCUMENTS_URL &&
    categoryId !== TWEETS_URL &&
    categoryId !== LINKS_URL &&
    categoryId !== AUDIO_URL &&
    categoryId !== instagramType &&
    categoryId !== UNCATEGORIZED_URL
  );
}

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { category_id, from, sort_by: sortValue } = data;
      const userId = user.id;
      const { email } = user;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.category_id = category_id;
        ctx.fields.from = from;
        ctx.fields.sort_by = sortValue;
      }

      // Determine if user is in a specific numeric category (not trash/tweets/links/etc.)
      const categoryCondition = isNumericCategory(category_id);
      const isUncategorized = category_id === UNCATEGORIZED_URL;

      // Check collaborator/owner status for category-scoped queries
      let isSharedCategory = false;

      if (categoryCondition) {
        if (!email) {
          throw new RecollectApiError("service_unavailable", {
            cause: new Error("User email not found"),
            message: "User email not found in auth context",
            operation: "validate_user",
          });
        }

        const numericCategoryId = Number.parseInt(category_id, 10);

        try {
          isSharedCategory = await isUserOwnerOrAnyCollaborator({
            categoryId: numericCategoryId,
            email,
            supabase,
            userId,
          });
        } catch (error) {
          throw new RecollectApiError("service_unavailable", {
            cause: error instanceof Error ? error : new Error("Category access check failed"),
            message: "Error checking category access",
            operation: "check_category_access",
          });
        }
      }

      // Build dynamic select string based on category context
      const needsJunction = categoryCondition || isUncategorized;
      const baseSelect = "*";
      const junctionSelect = `*, ${BOOKMARK_CATEGORIES_TABLE_NAME}!inner(bookmark_id, category_id)`;
      const sharedJunctionSelect = `*, user_id(id, profile_pic), ${BOOKMARK_CATEGORIES_TABLE_NAME}!inner(bookmark_id, category_id)`;

      let selectString: string;
      if (needsJunction) {
        selectString = isSharedCategory ? sharedJunctionSelect : junctionSelect;
      } else {
        selectString = baseSelect;
      }

      // Build main bookmarks query with pagination
      const isTrashPage = category_id === TRASH_URL;
      let query = supabase
        .from(MAIN_TABLE_NAME)
        .select(selectString)
        .range(from, from + PAGINATION_LIMIT - 1);

      // Filter by trash status
      query = isTrashPage ? query.not("trash", "is", null) : query.is("trash", null);

      // Category filtering
      if (categoryCondition) {
        const numericCategoryId = Number.parseInt(category_id, 10);
        query = query.eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, numericCategoryId);

        if (!isSharedCategory) {
          // Not collaborator — only access items they created
          query = query.eq("user_id", userId);
        }
        // Shared category: access all items (no user filter)
      } else {
        query = query.eq("user_id", userId);
      }

      // Uncategorized: filter to category_id = 0
      if (isUncategorized) {
        query = query
          .eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, 0)
          .eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.user_id`, userId);
      }

      // Media category predicates (images, videos, documents, audio)
      const mediaCategoryPredicate = getBookmarkMediaCategoryPredicate(category_id);
      if (mediaCategoryPredicate) {
        query = query.or(mediaCategoryPredicate);
      }

      // Type-specific filters
      if (category_id === instagramType) {
        query = query.eq("type", instagramType);
      }

      if (category_id === LINKS_URL) {
        query = query.eq("type", bookmarkType);
      }

      if (category_id === TWEETS_URL) {
        query = query.eq("type", tweetType).order("sort_index", { ascending: false });
      }

      if (category_id === INSTAGRAM_URL) {
        query = query.eq("type", instagramType);
      }

      // Sort ordering
      if (isTrashPage) {
        query = query.order("trash", { ascending: false });
      } else if (sortValue === "date-sort-ascending") {
        query = query.order("inserted_at", { ascending: false });
      } else if (sortValue === "date-sort-descending") {
        query = query.order("inserted_at", { ascending: true });
      } else if (sortValue === "alphabetical-sort-ascending") {
        query = query.order("title", { ascending: true });
      } else if (sortValue === "alphabetical-sort-descending") {
        query = query.order("title", { ascending: false });
      } else if (sortValue === "url-sort-ascending") {
        query = query.order("url", { ascending: true });
      } else if (sortValue === "url-sort-descending") {
        query = query.order("url", { ascending: false });
      } else if (category_id === TWEETS_URL) {
        query = query.order("sort_index", { ascending: false });
      } else {
        query = query.order("inserted_at", { ascending: true });
      }

      // Dynamic select string prevents Supabase type inference — override at terminal position
      const { data: bookmarkData, error: bookmarkError } = await query.overrideTypes<
        BookmarkRow[],
        { merge: false }
      >();

      if (bookmarkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkError,
          message: "Failed to fetch bookmarks",
          operation: "fetch_bookmarks",
        });
      }

      if (!bookmarkData) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Bookmarks data is null"),
          message: "Failed to fetch bookmarks",
          operation: "fetch_bookmarks",
        });
      }

      // Get bookmark IDs for junction queries
      const bookmarkIds = bookmarkData.map((item) => item.id);

      // Empty-page short-circuit: no bookmarks means no junction data needed
      if (bookmarkIds.length === 0) {
        return [];
      }

      if (ctx?.fields) {
        ctx.fields.bookmark_count = bookmarkIds.length;
      }

      // Parallel junction queries with FK joins for resolved tag/category names
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

      const { data: bookmarksWithTags } = tagsResult;
      const { data: bookmarksWithCategories } = categoriesResult;

      // Stitch tags and categories onto each bookmark
      const finalData = bookmarkData.map((item) => {
        const matchedTags = bookmarksWithTags?.filter((tagItem) => tagItem.bookmark_id === item.id);
        const matchedCategories = bookmarksWithCategories?.filter(
          (catItem) => catItem.bookmark_id === item.id,
        );

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
        };
      });

      return finalData;
    },
    inputSchema: FetchBookmarksDataInputSchema,
    outputSchema: FetchBookmarksDataOutputSchema,
    route: ROUTE,
  }),
);
