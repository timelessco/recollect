import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";

import { type UserCollection } from "@/async/ai/imageToText";
import { createServerServiceClient } from "@/lib/supabase/service";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	PROFILES,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

export interface FetchUserCollectionsProps {
	supabase: SupabaseClient;
	userId: string;
}

/**
 * Fetches user's categories (excluding Uncategorized) for auto-assignment context.
 * Non-critical — returns empty array on failure.
 */
export async function fetchUserCollections(
	props: FetchUserCollectionsProps,
): Promise<UserCollection[]> {
	const { supabase, userId } = props;

	try {
		// Check if user has auto-assign enabled
		const { data: profileData } = await supabase
			.from(PROFILES)
			.select("auto_assign_collections")
			.eq("id", userId)
			.single();

		if (profileData?.auto_assign_collections === false) {
			return [];
		}

		const { data: categoriesData } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("id, category_name")
			.eq("user_id", userId)
			.neq("id", UNCATEGORIZED_CATEGORY_ID);

		return (
			categoriesData?.map((category) => ({
				id: category.id,
				name: category.category_name,
			})) ?? []
		);
	} catch (error) {
		console.error("[auto-assign] Failed to fetch categories:", error);
		Sentry.captureException(error, {
			tags: { operation: "fetch_categories_for_auto_assign", userId },
		});
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
 * Uses service client to bypass RLS. Non-critical — failures are logged to Sentry
 * but never thrown.
 */
export async function autoAssignCollections(
	props: AutoAssignCollectionsProps,
): Promise<void> {
	const { bookmarkId, matchedCollectionIds, route, userId } = props;

	if (matchedCollectionIds.length === 0) {
		return;
	}

	try {
		const serviceClient = await createServerServiceClient();

		// Guard: only assign if bookmark still has only category 0 (uncategorized)
		const { data: currentCategories } = await serviceClient
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.select("category_id")
			.eq("bookmark_id", bookmarkId)
			.eq("user_id", userId);

		const hasOnlyUncategorized =
			currentCategories?.length === 1 &&
			currentCategories[0]?.category_id === UNCATEGORIZED_CATEGORY_ID;

		if (!hasOnlyUncategorized) {
			console.log(
				`[${route}] Skipped auto-assign — bookmark already categorized:`,
				{ bookmarkId },
			);
			return;
		}

		// Remove uncategorized entry
		const { error: deleteError } = await serviceClient
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.delete()
			.eq("bookmark_id", bookmarkId)
			.eq("user_id", userId)
			.eq("category_id", UNCATEGORIZED_CATEGORY_ID);

		if (deleteError) {
			throw deleteError;
		}

		// Insert matched collections
		const { error: insertError } = await serviceClient
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.insert(
				matchedCollectionIds.map((categoryId) => ({
					bookmark_id: bookmarkId,
					category_id: categoryId,
					user_id: userId,
				})),
			);

		if (insertError) {
			throw insertError;
		}

		console.log(`[${route}] Auto-assigned collections:`, {
			bookmarkId,
			collectionIds: matchedCollectionIds,
		});
	} catch (error) {
		console.error(`[${route}] Auto-assign collections failed:`, error);
		Sentry.captureException(error, {
			tags: { operation: "auto_assign_collections", userId },
			extra: { bookmarkId, matchedCollectionIds },
		});
	}
}
