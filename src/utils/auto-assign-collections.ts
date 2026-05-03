import type { UserCollection } from "@/async/ai/schemas/image-analysis-schema";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/api-helpers/axiom";
import { extractErrorFields } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { CATEGORIES_TABLE_NAME, PROFILES, UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

export interface FetchUserCollectionsProps {
  autoAssignEnabled?: boolean;
  supabase: SupabaseClient<Database>;
  userId: string;
}

/**
 * Fetches user's categories (excluding Uncategorized) for auto-assignment context.
 * Non-critical — returns empty array on failure.
 */
export async function fetchUserCollections(
  props: FetchUserCollectionsProps,
): Promise<UserCollection[]> {
  const { autoAssignEnabled, supabase, userId } = props;

  try {
    // When pre-fetched toggle is provided, use it directly to avoid duplicate query
    if (autoAssignEnabled !== undefined) {
      if (!autoAssignEnabled) {
        return [];
      }
    } else {
      // Fallback: fetch toggle from DB (legacy callers)
      const { data: profileData } = await supabase
        .from(PROFILES)
        .select("ai_features_toggle")
        .eq("id", userId)
        .maybeSingle();

      const aiFeatures =
        profileData?.ai_features_toggle !== null &&
        typeof profileData?.ai_features_toggle === "object" &&
        !Array.isArray(profileData?.ai_features_toggle)
          ? profileData.ai_features_toggle
          : null;

      if (aiFeatures?.auto_assign_collections === false) {
        return [];
      }
    }

    const { data: categoriesData } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .select("id, category_name")
      .eq("user_id", userId)
      .neq("id", UNCATEGORIZED_CATEGORY_ID);

    return (
      categoriesData
        ?.filter((category) => category.category_name !== null)
        .map((category) => ({
          id: category.id,
          name: category.category_name ?? "",
        })) ?? []
    );
  } catch (error) {
    logger.warn("fetch_categories_for_auto_assign_failed", {
      user_id: userId,
      ...extractErrorFields(error),
    });
    setPayload(getServerContext(), { fetch_categories_for_auto_assign_failed: true });
    return [];
  }
}

export interface AutoAssignCollectionsProps {
  bookmarkId: number;
  matchedCollectionIds: number[];
  route: string;
  userId: string;
}

/**
 * Auto-assigns bookmark to matched collections if it's still uncategorized.
 * Uses service client to bypass RLS. Non-critical — failures warn to Axiom
 * but never throw.
 */
export async function autoAssignCollections(props: AutoAssignCollectionsProps): Promise<void> {
  const { bookmarkId, matchedCollectionIds, route, userId } = props;

  if (matchedCollectionIds.length === 0) {
    return;
  }

  try {
    const serviceClient = createServerServiceClient();

    const { error } = await serviceClient.rpc("auto_assign_collections", {
      p_bookmark_id: bookmarkId,
      p_category_ids: matchedCollectionIds,
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.warn("auto_assign_collections_failed", {
      user_id: userId,
      bookmark_id: bookmarkId,
      matched_collection_count: matchedCollectionIds.length,
      route,
      ...extractErrorFields(error),
    });
    setPayload(getServerContext(), { auto_assign_collections_failed: true });
  }
}
