import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CATEGORIES_TABLE_NAME, SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

interface CheckCategoryAccessProps {
  categoryId: number;
  email: string;
  supabase: SupabaseClient<Database>;
  userId: string;
}

/**
 * Checks if a user is either the owner or an editor-collaborator of a category.
 * Throws on database errors (caller's try-catch handles).
 */
export async function checkIfUserIsCategoryOwnerOrCollaborator(
  props: CheckCategoryAccessProps,
): Promise<boolean> {
  const { categoryId, email, supabase, userId } = props;

  // Check category ownership
  const { data: categoryData, error: categoryError } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select("user_id")
    .eq("id", categoryId);

  if (categoryError) {
    throw new Error(`Failed to check category ownership: ${categoryError.message}`);
  }

  if (categoryData?.at(0)?.user_id === userId) {
    return true;
  }

  // Check collaborator access
  const { data: shareData, error: shareError } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select("id, edit_access")
    .eq("category_id", categoryId)
    .eq("email", email);

  if (shareError) {
    throw new Error(`Failed to check share access: ${shareError.message}`);
  }

  return shareData?.some((share) => share.edit_access) ?? false;
}

/**
 * Checks if a user is the owner or ANY-level collaborator of a category.
 * Unlike checkIfUserIsCategoryOwnerOrCollaborator, this includes read-only collaborators.
 * Used by search-bookmarks to determine if user can see all bookmarks in a shared category.
 * Throws on database errors (caller's try-catch handles).
 */
export async function isUserOwnerOrAnyCollaborator(
  props: CheckCategoryAccessProps,
): Promise<boolean> {
  const { categoryId, email, supabase, userId } = props;

  // Check category ownership
  const { data: categoryData, error: categoryError } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select("user_id")
    .eq("id", categoryId);

  if (categoryError) {
    throw new Error(`Failed to check category ownership: ${categoryError.message}`);
  }

  if (categoryData?.at(0)?.user_id === userId) {
    return true;
  }

  // Check ANY collaborator access (including read-only)
  const { data: shareData, error: shareError } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select("id")
    .eq("category_id", categoryId)
    .eq("email", email);

  if (shareError) {
    throw new Error(`Failed to check share access: ${shareError.message}`);
  }

  return (shareData?.length ?? 0) > 0;
}
