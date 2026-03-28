import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { isNonNullable } from "@/utils/assertion-utils";
import { PROFILES, SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import { FetchUserCategoriesInputSchema, FetchUserCategoriesOutputSchema } from "./schema";

const ROUTE = "v2-fetch-user-categories";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;
      const userEmail = user.email;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      if (!userEmail) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("User email not found"),
          message: "User email not found in auth context",
          operation: "validate_user",
        });
      }

      // Batch 1: Fetch user's own categories and profile in parallel
      const [categoriesResult, profileResult] = await Promise.all([
        supabase.from("categories").select("*").eq("user_id", userId),
        supabase
          .from(PROFILES)
          // favorite_categories: @deprecated legacy compat for old mobile builds
          .select("profile_pic, user_name, favorite_categories")
          .eq("id", userId)
          .single(),
      ]);

      const { data: categoriesData, error: categoriesError } = categoriesResult;
      const { data: userProfile, error: profileError } = profileResult;

      if (profileError && ctx?.fields) {
        ctx.fields.profile_fetch_failed = true;
      }

      if (categoriesError) {
        throw new RecollectApiError("service_unavailable", {
          cause: categoriesError,
          message: "Failed to fetch categories",
          operation: "fetch_categories",
        });
      }

      if (!categoriesData) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Categories data is null"),
          message: "Failed to fetch categories",
          operation: "fetch_categories",
        });
      }

      // Query 3: Fetch all shared category data for collab data assembly
      const { data: sharedCategoryData, error: sharedCategoryError } = await supabase.from(
        SHARED_CATEGORIES_TABLE_NAME,
      ).select(`
          *,
          user_id (id, profile_pic),
          email
        `);

      if (sharedCategoryError && ctx?.fields) {
        // Don't throw here as shared categories are not critical
        ctx.fields.shared_category_fetch_failed = true;
      }

      // Query 4: Fetch categories where user is an accepted collaborator (pending excluded)
      const { data: userCollabCategoryData, error: userCollabError } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .select(`category_id!inner(*, user_id(id, email, profile_pic, user_name))`)
        .eq("email", userEmail)
        .eq("is_accept_pending", false);

      if (userCollabError) {
        throw new RecollectApiError("service_unavailable", {
          cause: userCollabError,
          message: "Failed to fetch collaborative categories",
          operation: "fetch_collab_categories",
        });
      }

      if (!userCollabCategoryData) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Collaborative categories data is null"),
          message: "Failed to fetch collaborative categories",
          operation: "fetch_collab_categories",
        });
      }

      // @deprecated Legacy compat for old mobile builds. Remove when old builds are no longer supported.
      const favoriteCategories: number[] = userProfile?.favorite_categories ?? [];

      // Attach authenticated user's profile to own categories (avoids profile join)
      const userCategories = categoriesData.map((item) => ({
        ...item,
        user_id: {
          email: userEmail,
          id: userId,
          profile_pic: userProfile?.profile_pic ?? "",
          user_name: userProfile?.user_name ?? "",
        },
      }));

      // Flatten collab categories (extract category_id from junction, normalize user_id shape)
      const flattenedCollabCategories = userCollabCategoryData.map((item) => {
        const cat = item.category_id;
        return {
          ...cat,
          user_id: {
            email: cat.user_id?.email ?? "",
            id: cat.user_id?.id ?? "",
            profile_pic: cat.user_id?.profile_pic ?? "",
            user_name: cat.user_id?.user_name ?? "",
          },
        };
      });

      // Merge own + collab categories
      const mergedCategories = [...userCategories, ...flattenedCollabCategories];

      if (ctx?.fields) {
        ctx.fields.category_count = mergedCategories.length;
      }

      // For each category, build collabData array and compute is_favorite
      const categoriesWithCollabData = mergedCategories.map((item) => {
        const collabData: {
          edit_access: boolean;
          is_accept_pending: boolean | null;
          isOwner: boolean;
          profile_pic: null | string;
          share_id: null | number;
          userEmail: string;
        }[] = [];

        if (sharedCategoryData) {
          for (const catItem of sharedCategoryData) {
            if (catItem.category_id === item.id) {
              collabData.push({
                edit_access: catItem.edit_access,
                is_accept_pending: catItem.is_accept_pending,
                isOwner: false,
                profile_pic: null,
                share_id: catItem.id,
                userEmail: catItem.email ?? "",
              });
            }
          }
        }

        // Add owner entry to collabData
        const collabDataWithOwner = [
          ...collabData,
          {
            edit_access: true,
            is_accept_pending: false,
            isOwner: true,
            profile_pic: item.user_id.profile_pic,
            share_id: null,
            userEmail: item.user_id.email,
          },
        ];

        return {
          ...item,
          collabData: collabDataWithOwner,
          // @deprecated legacy compat for old mobile builds
          is_favorite: favoriteCategories.includes(item.id),
        };
      });

      // Filter: Keep only categories where user is owner OR accepted collaborator
      // This excludes public categories owned by other users where the current user is NOT a collaborator
      const filteredCategories = categoriesWithCollabData.filter((item) => {
        const userCollabEntry = item.collabData.find(
          (collabItem) => collabItem.userEmail === userEmail,
        );

        // If logged-in user is a collaborator (not owner) for this category, keep it
        if (isNonNullable(userCollabEntry) && !userCollabEntry.isOwner) {
          return true;
        }

        // Only return public categories created by logged-in user
        // (exclude public categories owned by others where user is not a collaborator)
        if (item.is_public && item.user_id.id !== userId) {
          return false;
        }

        return true;
      });

      return filteredCategories;
    },
    inputSchema: FetchUserCategoriesInputSchema,
    outputSchema: FetchUserCategoriesOutputSchema,
    route: ROUTE,
  }),
);
