import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { isNonNullable } from "@/utils/assertion-utils";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  PROFILES,
  R2_MAIN_BUCKET_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  STORAGE_FILES_PATH,
  STORAGE_SCRAPPED_IMAGES_PATH,
  STORAGE_SCREENSHOT_IMAGES_PATH,
  STORAGE_USER_PROFILE_PATH,
  TAG_TABLE_NAME,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

import { DeleteUserInputSchema, DeleteUserOutputSchema } from "./schema";

const ROUTE = "v2-profiles-delete-user";

// ============================================================
// Storage cleanup — list and delete all objects at a given path
// ============================================================

async function deleteStoragePath(path: string): Promise<void> {
  const { data: files, error: listError } = await storageHelpers.listObjects(
    R2_MAIN_BUCKET_NAME,
    path,
  );

  if (listError !== null) {
    throw new Error(
      `Failed to list storage at ${path}: ${listError instanceof Error ? listError.message : JSON.stringify(listError)}`,
    );
  }

  const filesToRemove =
    isNonNullable(files) && files.length > 0 ? files.map((x) => `${x.Key}`) : [];

  if (filesToRemove.length > 0) {
    const { error: deleteError } = await storageHelpers.deleteObjects(
      R2_MAIN_BUCKET_NAME,
      filesToRemove,
    );

    if (deleteError !== null) {
      throw new Error(
        `Failed to delete storage at ${path}: ${deleteError instanceof Error ? deleteError.message : JSON.stringify(deleteError)}`,
      );
    }
  }
}

// ============================================================
// POST handler — cascade delete user data + R2 + auth
// ============================================================

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;
      const email = user.email ?? "";

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.operation = "delete_user";
      }

      // Step 1: Delete bookmark_tags (junction — must delete before bookmarks)
      const { error: bookmarkTagsError } = await supabase
        .from(BOOKMARK_TAGS_TABLE_NAME)
        .delete()
        .eq("user_id", userId);

      if (bookmarkTagsError) {
        throw new Error(`Failed to delete bookmark_tags: ${bookmarkTagsError.message}`);
      }

      // Step 2: Delete bookmarks
      const { error: bookmarksError } = await supabase
        .from(MAIN_TABLE_NAME)
        .delete()
        .eq("user_id", userId);

      if (bookmarksError) {
        throw new Error(`Failed to delete bookmarks: ${bookmarksError.message}`);
      }

      // Step 3: Delete tags
      const { error: tagsError } = await supabase
        .from(TAG_TABLE_NAME)
        .delete()
        .eq("user_id", userId);

      if (tagsError) {
        throw new Error(`Failed to delete tags: ${tagsError.message}`);
      }

      // Step 4: Delete shared_categories by user_id (categories user created)
      const { error: sharedByUserError } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .delete()
        .eq("user_id", userId);

      if (sharedByUserError) {
        throw new Error(
          `Failed to delete shared_categories by user_id: ${sharedByUserError.message}`,
        );
      }

      // Step 5: Delete shared_categories by email (categories user was invited to)
      const { error: sharedByEmailError } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .delete()
        .eq("email", email);

      if (sharedByEmailError) {
        throw new Error(
          `Failed to delete shared_categories by email: ${sharedByEmailError.message}`,
        );
      }

      // Step 6: Delete bookmark_categories junction (must delete before categories)
      // First get all category IDs for this user, then delete junction rows
      const { data: categoriesData, error: categoriesDataError } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .select("id")
        .eq("user_id", userId);

      if (categoriesDataError) {
        throw new Error(`Failed to fetch category IDs: ${categoriesDataError.message}`);
      }

      if (isNonNullable(categoriesData) && categoriesData.length > 0) {
        const categoryIds = categoriesData.map((item) => item.id);
        const { error: junctionDeleteError } = await supabase
          .from(BOOKMARK_CATEGORIES_TABLE_NAME)
          .delete()
          .in("category_id", categoryIds);

        if (junctionDeleteError) {
          throw new Error(`Failed to delete bookmark_categories: ${junctionDeleteError.message}`);
        }
      }

      // Step 7: Delete categories
      const { error: categoriesError } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .delete()
        .eq("user_id", userId);

      if (categoriesError) {
        throw new Error(`Failed to delete categories: ${categoriesError.message}`);
      }

      // Step 8: Delete profile
      const { error: profileError } = await supabase.from(PROFILES).delete().eq("id", userId);

      if (profileError) {
        throw new Error(`Failed to delete profile: ${profileError.message}`);
      }

      // Step 9: Delete R2 storage (4 paths)
      await deleteStoragePath(`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/`);
      await deleteStoragePath(`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/`);
      await deleteStoragePath(`${STORAGE_FILES_PATH}/${userId}/`);
      await deleteStoragePath(`${STORAGE_USER_PROFILE_PATH}/${userId}/`);

      // Step 10: Delete auth user via admin API (requires service-role)
      const serviceClient = createServerServiceClient();
      const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
      }

      if (ctx?.fields) {
        ctx.fields.user_deleted = true;
      }

      return { user: null };
    },
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
    route: ROUTE,
  }),
);
