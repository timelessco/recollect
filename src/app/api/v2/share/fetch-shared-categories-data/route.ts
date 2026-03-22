import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import {
  FetchSharedCategoriesDataInputSchema,
  FetchSharedCategoriesDataOutputSchema,
} from "./schema";

const ROUTE = "v2-share-fetch-shared-categories-data";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const { email, id: userId } = user;

    if (!email) {
      return apiWarn({
        context: { userId },
        message: "User email not available",
        route,
        status: 400,
      });
    }

    console.log(`[${route}] API called:`, { email, userId });

    const { data, error } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .select()
      .or(`email.eq.${email},user_id.eq.${userId}`);

    if (error) {
      return apiError({
        error,
        extra: { email },
        message: "Failed to fetch shared categories",
        operation: "shared_categories_fetch",
        route,
        userId,
      });
    }

    return data;
  },
  inputSchema: FetchSharedCategoriesDataInputSchema,
  outputSchema: FetchSharedCategoriesDataOutputSchema,
  route: ROUTE,
});
